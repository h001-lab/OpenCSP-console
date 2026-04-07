package io.hlab.opencsp.infrastructure.semaphore;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Semaphore REST API v2 클라이언트.
 *
 * <h3>Semaphore Task 흐름 (프로비저닝 1건당)</h3>
 * <ol>
 *   <li>POST /api/project/{id}/keys     → sshKeyId (Terraform output의 ssh_private_key 사용, 없으면 정적 config)</li>
 *   <li>POST /api/project/{id}/inventory → inventoryId</li>
 *   <li>POST /api/project/{id}/templates → templateId (동적 생성)</li>
 *   <li>POST /api/project/{id}/tasks     → taskId</li>
 * </ol>
 *
 * <h3>정리 (destroy 시)</h3>
 * <ol>
 *   <li>DELETE /api/project/{id}/templates/{templateId}</li>
 *   <li>DELETE /api/project/{id}/inventory/{inventoryId}</li>
 *   <li>DELETE /api/project/{id}/keys/{sshKeyId} (동적 생성된 경우만)</li>
 * </ol>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SemaphoreHttpClient implements SemaphoreClient {

    private final ConfigStore configStore;
    private final ObjectMapper objectMapper;

    // ──────────────────────────────────────────────────────────────────────────
    // SemaphoreClient 구현
    // ──────────────────────────────────────────────────────────────────────────

    @Override
    public boolean isConfigured() {
        return configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url")
                .filter(v -> !v.isBlank())
                .isPresent();
    }

    @Override
    public PostProvisionResult triggerPostProvisionJob(String crName, Map<String, String> outputs) {
        String baseUrl     = requireUrl();
        int    projectId   = requireInt("semaphore.project.id");
        int    repositoryId = requireInt("semaphore.repository.id");
        String playbook    = require("semaphore.playbook");
        String token       = require("semaphore.api.token");

        WebClient wc = buildWebClient(baseUrl, token);

        // 1. SSH 키 — Terraform output의 private key 우선 (키 이름 후보 순서대로 시도), 없으면 정적 config fallback
        String privateKey = outputs.getOrDefault("ssh_private_key",
                            outputs.getOrDefault("vm_ssh_private_key", null));
        int sshKeyId;
        boolean dynamicKey;
        if (privateKey != null && !privateKey.isBlank()) {
            sshKeyId   = createSshKey(wc, projectId, crName, privateKey);
            dynamicKey = true;
            log.info("[Semaphore] SSH 키 등록 (동적): crName={}, sshKeyId={}", crName, sshKeyId);
        } else {
            sshKeyId   = requireInt("semaphore.ssh.key.id");
            dynamicKey = false;
            log.info("[Semaphore] SSH 키 사용 (정적 config): crName={}, sshKeyId={}", crName, sshKeyId);
        }

        // 2. 인벤토리 생성
        String inventoryContent = buildInventory(crName, outputs);
        int inventoryId = createInventory(wc, projectId, crName, inventoryContent, sshKeyId);
        log.info("[Semaphore] 인벤토리 생성: crName={}, inventoryId={}", crName, inventoryId);

        // 3. 환경 — 정적 config(semaphore.environment.id) 우선, 없으면 동적 생성
        int envId;
        boolean dynamicEnv;
        Optional<Integer> staticEnvId = optionalInt("semaphore.environment.id");
        if (staticEnvId.isPresent()) {
            envId      = staticEnvId.get();
            dynamicEnv = false;
            log.info("[Semaphore] 환경 사용 (정적 config): crName={}, envId={}", crName, envId);
        } else {
            envId      = createEnvironment(wc, projectId, crName);
            dynamicEnv = true;
            log.info("[Semaphore] 환경 생성 (동적): crName={}, envId={}", crName, envId);
        }

        // 4. 템플릿 동적 생성
        int templateId = createTemplate(wc, projectId, crName, repositoryId, playbook, sshKeyId, inventoryId, envId);
        log.info("[Semaphore] 템플릿 생성: crName={}, templateId={}", crName, templateId);

        // 5. Task 실행
        int taskId = runTask(wc, projectId, templateId, inventoryId, crName);
        log.info("[Semaphore] Task 실행: crName={}, taskId={}", crName, taskId);

        // 동적 생성이 아닌 경우 sshKeyId는 -1로 저장 (cleanup 시 삭제 스킵)
        // environmentId는 정적/동적 관계없이 실제 ID 저장 — cleanup 시 config와 비교하여 삭제 여부 결정
        return new PostProvisionResult(dynamicKey ? sshKeyId : -1, inventoryId, templateId, taskId, envId);
    }

    @Override
    public TaskResult getTaskResult(int taskId) {
        String baseUrl   = requireUrl();
        int    projectId = requireInt("semaphore.project.id");
        String token     = require("semaphore.api.token");
        WebClient wc     = buildWebClient(baseUrl, token);

        try {
            // 태스크 상태 조회
            String taskJson = wc.get()
                    .uri("/api/project/{pid}/tasks/{tid}", projectId, taskId)
                    .retrieve().bodyToMono(String.class).block();
            JsonNode task   = objectMapper.readTree(taskJson);
            String status   = task.path("status").asText("unknown");
            boolean success = "success".equals(status);

            // 태스크 출력 조회
            String outputJson = wc.get()
                    .uri("/api/project/{pid}/tasks/{tid}/output", projectId, taskId)
                    .retrieve().bodyToMono(String.class).block();
            StringBuilder sb = new StringBuilder();
            for (JsonNode line : objectMapper.readTree(outputJson)) {
                sb.append(line.path("output").asText()).append("\n");
            }

            return new TaskResult(status, success, sb.toString().stripTrailing());
        } catch (WebClientResponseException e) {
            log.warn("[Semaphore] Task 결과 조회 실패: taskId={}, status={}", taskId, e.getStatusCode());
            return new TaskResult("error", false, "HTTP " + e.getStatusCode().value());
        } catch (Exception e) {
            log.warn("[Semaphore] Task 결과 조회 실패: taskId={}, error={}", taskId, e.getMessage());
            return new TaskResult("error", false, e.getMessage());
        }
    }

    @Override
    public void cleanupPostProvision(int sshKeyId, int templateId, int inventoryId, int environmentId) {
        String baseUrl   = requireUrl();
        int    projectId = requireInt("semaphore.project.id");
        String token     = require("semaphore.api.token");
        WebClient wc     = buildWebClient(baseUrl, token);

        deleteTemplate(wc, projectId, templateId);
        deleteInventory(wc, projectId, inventoryId);
        if (sshKeyId > 0) {
            deleteSshKey(wc, projectId, sshKeyId);
        }
        // 정적 config로 지정된 공유 환경은 삭제하지 않음
        boolean isStaticEnv = optionalInt("semaphore.environment.id")
                .filter(id -> id == environmentId)
                .isPresent();
        if (environmentId > 0 && !isStaticEnv) {
            deleteEnvironment(wc, projectId, environmentId);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Ansible 인벤토리 빌더
    // ──────────────────────────────────────────────────────────────────────────

    String buildInventory(String crName, Map<String, String> outputs) {
        String hostname = outputs.getOrDefault("vm_hostname",
                          outputs.getOrDefault("vm_name", crName));
        String ip       = outputs.getOrDefault("vm_ip",
                          outputs.getOrDefault("ip_address", ""));
        String user     = outputs.getOrDefault("ansible_user",
                          outputs.getOrDefault("vm_user", "ubuntu"));

        StringBuilder sb = new StringBuilder("[test_vms]\n");
        sb.append(hostname);
        if (!ip.isBlank()) sb.append(" ansible_host=").append(ip);
        sb.append(" ansible_user=").append(user);
        sb.append("\n\n[test_vms:vars]\n");
        sb.append("opencsp_cr_name=").append(crName).append("\n");
        if (!ip.isBlank())       sb.append("opencsp_vm_ip=").append(ip).append("\n");
        if (!hostname.isBlank()) sb.append("opencsp_vm_hostname=").append(hostname).append("\n");
        if (!hostname.isBlank()) sb.append("node_name=").append(hostname).append("\n");
        return sb.toString();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Semaphore API 호출
    // ──────────────────────────────────────────────────────────────────────────

    private int createSshKey(WebClient wc, int projectId, String crName, String privateKey) {
        Map<String, Object> ssh = new LinkedHashMap<>();
        ssh.put("private_key", privateKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name",       "opencsp-" + crName);
        body.put("project_id", projectId);
        body.put("type",       "ssh");
        body.put("ssh",        ssh);

        try {
            String response = wc.post()
                    .uri("/api/project/{id}/keys", projectId)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("id").asInt();
        } catch (WebClientResponseException e) {
            log.error("[Semaphore] SSH 키 등록 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Semaphore SSH 키 등록 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IllegalStateException("Semaphore SSH 키 등록 실패", e);
        }
    }

    private int createInventory(WebClient wc, int projectId, String crName,
                                String inventoryContent, int sshKeyId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name",       "opencsp-" + crName);
        body.put("project_id", projectId);
        body.put("inventory",  inventoryContent);
        body.put("ssh_key_id", sshKeyId);
        body.put("type",       "static");

        try {
            String response = wc.post()
                    .uri("/api/project/{id}/inventory", projectId)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("id").asInt();
        } catch (WebClientResponseException e) {
            log.error("[Semaphore] 인벤토리 생성 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Semaphore 인벤토리 생성 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IllegalStateException("Semaphore 인벤토리 생성 실패", e);
        }
    }

    private int createTemplate(WebClient wc, int projectId, String crName,
                               int repositoryId, String playbook, int sshKeyId, int inventoryId,
                               int environmentId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("project_id",    projectId);
        body.put("name",          "opencsp-" + crName);
        body.put("app",           "ansible");
        body.put("playbook",      playbook);
        body.put("repository_id", repositoryId);
        body.put("inventory_id",  inventoryId);
        body.put("ssh_key_id",    sshKeyId);
        body.put("environment_id", environmentId);
        body.put("type",          "");

        try {
            String response = wc.post()
                    .uri("/api/project/{id}/templates", projectId)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("id").asInt();
        } catch (WebClientResponseException e) {
            log.error("[Semaphore] 템플릿 생성 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Semaphore 템플릿 생성 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IllegalStateException("Semaphore 템플릿 생성 실패", e);
        }
    }

    private int runTask(WebClient wc, int projectId, int templateId,
                        int inventoryId, String crName) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("template_id",  templateId);
        body.put("inventory_id", inventoryId);
        body.put("message",      "OpenCSP post-provision: " + crName);
        body.put("debug",        false);
        body.put("dry_run",      false);
        body.put("diff",         false);

        try {
            String response = wc.post()
                    .uri("/api/project/{id}/tasks", projectId)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("id").asInt();
        } catch (WebClientResponseException e) {
            log.error("[Semaphore] Task 실행 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Semaphore Task 실행 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IllegalStateException("Semaphore Task 실행 실패", e);
        }
    }

    private void deleteTemplate(WebClient wc, int projectId, int templateId) {
        try {
            wc.delete()
                    .uri("/api/project/{projectId}/templates/{templateId}", projectId, templateId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            log.info("[Semaphore] 템플릿 삭제: templateId={}", templateId);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("[Semaphore] 템플릿 이미 없음 (정상): templateId={}", templateId);
                return;
            }
            log.warn("[Semaphore] 템플릿 삭제 실패: templateId={}, status={}", templateId, e.getStatusCode());
        }
    }

    private void deleteInventory(WebClient wc, int projectId, int inventoryId) {
        try {
            wc.delete()
                    .uri("/api/project/{projectId}/inventory/{inventoryId}", projectId, inventoryId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            log.info("[Semaphore] 인벤토리 삭제: inventoryId={}", inventoryId);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("[Semaphore] 인벤토리 이미 없음 (정상): inventoryId={}", inventoryId);
                return;
            }
            log.warn("[Semaphore] 인벤토리 삭제 실패: inventoryId={}, status={}", inventoryId, e.getStatusCode());
        }
    }

    private void deleteSshKey(WebClient wc, int projectId, int sshKeyId) {
        try {
            wc.delete()
                    .uri("/api/project/{projectId}/keys/{sshKeyId}", projectId, sshKeyId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            log.info("[Semaphore] SSH 키 삭제: sshKeyId={}", sshKeyId);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("[Semaphore] SSH 키 이미 없음 (정상): sshKeyId={}", sshKeyId);
                return;
            }
            log.warn("[Semaphore] SSH 키 삭제 실패: sshKeyId={}, status={}", sshKeyId, e.getStatusCode());
        }
    }

    private int createEnvironment(WebClient wc, int projectId, String crName) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name",       "opencsp-" + crName);
        body.put("project_id", projectId);
        body.put("json",       "{}");
        body.put("env",        null);

        try {
            String response = wc.post()
                    .uri("/api/project/{id}/environment", projectId)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("id").asInt();
        } catch (WebClientResponseException e) {
            log.error("[Semaphore] 환경 생성 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Semaphore 환경 생성 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new IllegalStateException("Semaphore 환경 생성 실패", e);
        }
    }

    private void deleteEnvironment(WebClient wc, int projectId, int environmentId) {
        try {
            wc.delete()
                    .uri("/api/project/{projectId}/environment/{environmentId}", projectId, environmentId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            log.info("[Semaphore] 환경 삭제: environmentId={}", environmentId);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("[Semaphore] 환경 이미 없음 (정상): environmentId={}", environmentId);
                return;
            }
            log.warn("[Semaphore] 환경 삭제 실패: environmentId={}, status={}", environmentId, e.getStatusCode());
        }
    }

    private String requireUrl() {
        return configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url")
                .orElseThrow(() -> new IllegalStateException("semaphore.url 설정이 없습니다."));
    }

    private String require(String key) {
        String value = configStore.get(ConfigCategory.SEMAPHORE, key)
                .orElseThrow(() -> new IllegalStateException("Semaphore 설정 누락: " + key));
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Semaphore 설정값이 비어있음: " + key);
        }
        return value;
    }

    private Optional<Integer> optionalInt(String key) {
        return configStore.get(ConfigCategory.SEMAPHORE, key)
                .filter(v -> !v.isBlank())
                .map(v -> {
                    try { return Integer.parseInt(v.trim()); }
                    catch (NumberFormatException e) { return null; }
                });
    }

    private int requireInt(String key) {
        String value = require(key);
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Semaphore 설정값이 정수가 아님: " + key + "=" + value, e);
        }
    }

    private WebClient buildWebClient(String baseUrl, String token) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + token)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
