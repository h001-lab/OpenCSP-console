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

/**
 * Semaphore REST API v2 클라이언트.
 *
 * <h3>Ansible 인벤토리 형식 (static INI)</h3>
 * <pre>
 * [all]
 * vm-hostname ansible_host=192.168.1.100 ansible_user=root
 * </pre>
 *
 * <h3>Semaphore Task 흐름</h3>
 * <ol>
 *   <li>POST /api/project/{id}/inventory → inventoryId 획득</li>
 *   <li>POST /api/project/{id}/tasks (template_id + inventory_id) → taskId 반환</li>
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
        return configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url").isPresent();
    }

    @Override
    public int triggerPostProvisionJob(String crName, Map<String, String> outputs) {
        String baseUrl    = requireUrl();
        int    projectId  = requireInt("semaphore.project.id");
        int    templateId = requireInt("semaphore.template.id");
        int    sshKeyId   = requireInt("semaphore.ssh.key.id");
        String token      = require("semaphore.api.token");

        WebClient wc = buildWebClient(baseUrl, token);

        // 1. 인벤토리 생성
        String inventoryContent = buildInventory(crName, outputs);
        int inventoryId = createInventory(wc, projectId, crName, inventoryContent, sshKeyId);
        log.info("[Semaphore] 인벤토리 생성: crName={}, inventoryId={}", crName, inventoryId);

        // 2. Task 실행
        int taskId = runTask(wc, projectId, templateId, inventoryId, crName);
        log.info("[Semaphore] Task 실행: crName={}, taskId={}", crName, taskId);

        return taskId;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Ansible 인벤토리 빌더
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Terraform outputs에서 vm_ip / vm_hostname을 추출해 Ansible 인벤토리 INI를 생성한다.
     *
     * <p>Ansible playbook은 아래 변수들을 extra_vars로 받을 수도 있다:
     * {@code opencsp_cr_name}, {@code opencsp_vm_ip}, {@code opencsp_vm_hostname}
     */
    String buildInventory(String crName, Map<String, String> outputs) {
        String hostname = outputs.getOrDefault("vm_hostname",
                          outputs.getOrDefault("vm_name", crName));
        String ip       = outputs.getOrDefault("vm_ip",
                          outputs.getOrDefault("ip_address", ""));
        String user     = outputs.getOrDefault("ansible_user", "root");

        StringBuilder sb = new StringBuilder("[all]\n");
        sb.append(hostname);
        if (!ip.isBlank()) sb.append(" ansible_host=").append(ip);
        sb.append(" ansible_user=").append(user);
        sb.append("\n\n[all:vars]\n");
        sb.append("opencsp_cr_name=").append(crName).append("\n");
        if (!ip.isBlank())       sb.append("opencsp_vm_ip=").append(ip).append("\n");
        if (!hostname.isBlank()) sb.append("opencsp_vm_hostname=").append(hostname).append("\n");
        return sb.toString();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Semaphore API 호출
    // ──────────────────────────────────────────────────────────────────────────

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

    // ──────────────────────────────────────────────────────────────────────────
    // 헬퍼
    // ──────────────────────────────────────────────────────────────────────────

    private String requireUrl() {
        return configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url")
                .orElseThrow(() -> new IllegalStateException("semaphore.url 설정이 없습니다."));
    }

    private String require(String key) {
        return configStore.get(ConfigCategory.SEMAPHORE, key)
                .orElseThrow(() -> new IllegalStateException("Semaphore 설정 누락: " + key));
    }

    private int requireInt(String key) {
        return Integer.parseInt(require(key));
    }

    private WebClient buildWebClient(String baseUrl, String token) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + token)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
