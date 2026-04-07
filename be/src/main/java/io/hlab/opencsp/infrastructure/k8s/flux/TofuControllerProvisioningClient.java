package io.hlab.opencsp.infrastructure.k8s.flux;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.infrastructure.k8s.ProvisionRequest;
import io.hlab.opencsp.infrastructure.k8s.ProvisioningClient;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.net.ssl.SSLException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.netty.http.client.HttpClient;

/**
 * FluxCD + tofu-controller를 이용한 Terraform CR 기반 프로비저닝 클라이언트.
 * <p>
 * app.k8s.enabled=true 일 때 활성화된다.
 * fabric8 KubernetesClient 대신 WebClient로 K8s API를 직접 호출한다.
 * (fabric8의 custom ObjectMapper가 CRD additionalProperties 직렬화를 실패하는 문제 우회)
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.k8s.enabled", havingValue = "true")
@RequiredArgsConstructor
public class TofuControllerProvisioningClient implements ProvisioningClient {

    private static final String TERRAFORM_GROUP_VERSION = "infra.contrib.fluxcd.io/v1alpha2";
    private static final String TERRAFORM_KIND = "Terraform";
    private static final String TERRAFORM_PLURAL = "terraforms";

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${app.k8s.api-server}")
    private String apiServer;

    @Value("${app.k8s.token}")
    private String token;

    @Value("${app.k8s.trust-certs:true}")
    private boolean trustCerts;

    @Value("${app.k8s.flux.namespace:flux-system}")
    private String fluxNamespace;

    @Value("${app.k8s.flux.git-repository-namespace:flux-system}")
    private String gitRepositoryNamespace;

    @Value("${app.k8s.flux.interval:10m}")
    private String interval;

    @Value("${app.k8s.flux.vars-from-secret:terraform-secrets}")
    private String varsFromSecret;

    @Value("${app.k8s.flux.runner-ssh-secret:pve-ssh-key}")
    private String runnerSshSecret;

    // -------------------------------------------------------------------------
    // ProvisioningClient 구현
    // -------------------------------------------------------------------------

    @Override
    public String provision(ProvisionRequest request) {
        Map<String, Object> cr = buildCrMap(request);
        String uri = terraformUri(fluxNamespace);

        try {
            createWebClient().post()
                    .uri(uri)
                    .bodyValue(cr)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Terraform CR 생성 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Terraform CR 생성 실패: " + e.getMessage(), e);
        }

        log.info("Terraform CR created: namespace={}, name={}, module={}, user={}",
                fluxNamespace, request.getCrName(), request.getModuleType(), request.getUserId());
        return request.getCrName();
    }

    @Override
    public void destroy(String crName) {
        String uri = terraformUri(fluxNamespace) + "/" + crName;
        WebClient client = createWebClient();

        // CR 삭제 — tofu-controller가 deletionTimestamp를 감지하여 terraform destroy 실행 후 finalizer 제거
        try {
            client.delete()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.info("Terraform CR가 이미 존재하지 않음 (정상): name={}", crName);
                return;
            }
            log.error("Terraform CR 삭제 실패: name={}, status={}, body={}", crName, e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Terraform CR 삭제 실패: " + e.getMessage(), e);
        }

        log.info("Terraform CR deleted: namespace={}, name={}", fluxNamespace, crName);
    }

    @Override
    public void forceDelete(String crName) {
        String uri = terraformUri(fluxNamespace) + "/" + crName;
        WebClient client = createWebClient();

        // finalizer 제거 (merge-patch)
        try {
            client.patch()
                    .uri(uri)
                    .header("Content-Type", "application/merge-patch+json")
                    .bodyValue("{\"metadata\":{\"finalizers\":[]}}")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            log.info("Terraform CR finalizer 강제 제거: name={}", crName);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() != 404) {
                log.warn("Finalizer 제거 실패 (계속 진행): name={}, status={}", crName, e.getStatusCode());
            }
        }

        // CR 삭제
        try {
            client.delete()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            log.info("Terraform CR 강제 삭제 완료: name={}", crName);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() != 404) {
                log.error("Terraform CR 강제 삭제 실패: name={}, status={}", crName, e.getStatusCode());
                throw new RuntimeException("Terraform CR 강제 삭제 실패: " + e.getMessage(), e);
            }
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getStatus(String crName) {
        String uri = terraformUri(fluxNamespace) + "/" + crName;

        try {
            Map<String, Object> cr = createWebClient().get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (cr == null) return Map.of("phase", "NOT_FOUND");

            Object status = cr.get("status");
            return status instanceof Map ? (Map<String, Object>) status : Map.of("phase", "UNKNOWN");
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) return Map.of("phase", "NOT_FOUND");
            log.error("Terraform CR 상태 조회 실패: name={}, status={}", crName, e.getStatusCode());
            throw new RuntimeException("Terraform CR 상태 조회 실패: " + e.getMessage(), e);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Map<String, Object>> listAllStatus(String namespace) {
        String uri = terraformUri(namespace);
        try {
            Map<String, Object> list = createWebClient().get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            Map<String, Map<String, Object>> result = new java.util.LinkedHashMap<>();
            if (list == null) return result;

            List<Map<String, Object>> items = (List<Map<String, Object>>) list.get("items");
            if (items == null) return result;

            for (Map<String, Object> item : items) {
                Map<String, Object> metadata = (Map<String, Object>) item.get("metadata");
                String name = metadata != null ? (String) metadata.get("name") : null;
                if (name == null) continue;
                Object status = item.get("status");
                result.put(name, status instanceof Map ? (Map<String, Object>) status : Map.of());
            }
            return result;
        } catch (WebClientResponseException e) {
            log.error("Terraform CR 목록 조회 실패: namespace={}, status={}", namespace, e.getStatusCode());
            throw new RuntimeException("Terraform CR 목록 조회 실패: " + e.getMessage(), e);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<CrMeta> listAllCrMeta(String namespace) {
        String uri = terraformUri(namespace);
        try {
            Map<String, Object> list = createWebClient().get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (list == null) return List.of();
            List<Map<String, Object>> items = (List<Map<String, Object>>) list.get("items");
            if (items == null) return List.of();

            return items.stream().map(item -> {
                Map<String, Object> metadata = (Map<String, Object>) item.get("metadata");
                String name = metadata != null ? (String) metadata.get("name") : null;
                if (name == null) return null;

                Map<String, Object> labels = metadata.containsKey("labels")
                        ? (Map<String, Object>) metadata.get("labels") : Map.of();
                String userId     = (String) labels.getOrDefault("app.opencsp.io/user-id", "unknown");
                String moduleType = (String) labels.getOrDefault("app.opencsp.io/module-type", "unknown");

                String gitRepo = "unknown";
                Object specObj = item.get("spec");
                if (specObj instanceof Map<?, ?> spec) {
                    Object sourceRef = ((Map<String, Object>) spec).get("sourceRef");
                    if (sourceRef instanceof Map<?, ?> sr) {
                        Object repoName = ((Map<String, Object>) sr).get("name");
                        if (repoName instanceof String s) gitRepo = s;
                    }
                }

                Object statusObj = item.get("status");
                Map<String, Object> statusMap = statusObj instanceof Map
                        ? (Map<String, Object>) statusObj : Map.of();

                return new CrMeta(name, userId, moduleType, gitRepo, statusMap);
            }).filter(m -> m != null).toList();
        } catch (WebClientResponseException e) {
            log.error("Terraform CR 메타 목록 조회 실패: namespace={}, status={}", namespace, e.getStatusCode());
            throw new RuntimeException("Terraform CR 메타 조회 실패: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteTfStateSecret(String crName) {
        String secretName = "tfstate-default-" + crName;
        String uri = "/api/v1/namespaces/" + fluxNamespace + "/secrets/" + secretName;
        try {
            createWebClient().delete()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
            log.info("tfstate Secret 삭제 완료: secretName={}", secretName);
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("tfstate Secret 이미 없음 (정상): secretName={}", secretName);
                return;
            }
            log.warn("tfstate Secret 삭제 실패: secretName={}, status={}", secretName, e.getStatusCode());
        } catch (Exception e) {
            log.warn("tfstate Secret 삭제 실패: secretName={}, error={}", secretName, e.getMessage());
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, OutputEntry> getOutputs(String crName) {
        // 1. status.outputs 시도 (일부 tofu-controller 버전)
        Map<String, OutputEntry> fromStatus = getOutputsFromStatus(crName);
        if (!fromStatus.isEmpty()) return fromStatus;

        // 2. writeOutputsToSecret에서 읽기 (v1alpha2 기본 방식)
        return getOutputsFromSecret(crName);
    }

    @SuppressWarnings("unchecked")
    private Map<String, OutputEntry> getOutputsFromStatus(String crName) {
        String uri = terraformUri(fluxNamespace) + "/" + crName;
        try {
            Map<String, Object> cr = createWebClient().get()
                    .uri(uri).retrieve().bodyToMono(Map.class).block();
            if (cr == null) return Map.of();

            Object status = cr.get("status");
            if (!(status instanceof Map<?, ?> statusMap)) return Map.of();

            Object outputsObj = ((Map<String, Object>) statusMap).get("outputs");
            if (!(outputsObj instanceof Map<?, ?> rawOutputs)) return Map.of();

            Map<String, OutputEntry> result = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : rawOutputs.entrySet()) {
                String key = entry.getKey().toString();
                if (!(entry.getValue() instanceof Map<?, ?> outputVal)) continue;
                String value = outputVal.containsKey("value")
                        ? String.valueOf(outputVal.get("value")) : null;
                String type = outputVal.containsKey("type")
                        ? String.valueOf(outputVal.get("type")) : "string";
                boolean sensitive = Boolean.TRUE.equals(outputVal.get("sensitive"));
                result.put(key, new OutputEntry(value, type, sensitive));
            }
            if (!result.isEmpty()) {
                log.info("Terraform outputs (status): crName={}, keys={}", crName, result.keySet());
            }
            return result;
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) return Map.of();
            log.warn("Terraform outputs (status) 조회 실패: crName={}, status={}", crName, e.getStatusCode());
            return Map.of();
        }
    }

    /**
     * spec.writeOutputsToSecret으로 생성된 Secret에서 outputs를 읽는다.
     * Secret 이름: "tf-output-{crName}", 네임스페이스: fluxNamespace
     * Secret data 각 키는 output 이름, 값은 base64(JSON-encoded value).
     */
    @SuppressWarnings("unchecked")
    private Map<String, OutputEntry> getOutputsFromSecret(String crName) {
        String secretName = "tf-output-" + crName;
        String uri = "/api/v1/namespaces/" + fluxNamespace + "/secrets/" + secretName;
        try {
            Map<String, Object> secret = createWebClient().get()
                    .uri(uri).retrieve().bodyToMono(Map.class).block();
            if (secret == null) return Map.of();

            Object dataObj = secret.get("data");
            if (!(dataObj instanceof Map<?, ?> data)) return Map.of();

            Map<String, OutputEntry> result = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : data.entrySet()) {
                String key = entry.getKey().toString();
                if (entry.getValue() == null) continue;
                try {
                    byte[] decoded = Base64.getDecoder().decode(entry.getValue().toString());
                    String raw = new String(decoded).trim();
                    // JSON 문자열 값은 따옴표로 감싸져 있음: "\"192.168.1.100\"" → 제거
                    if (raw.startsWith("\"") && raw.endsWith("\"")) {
                        raw = raw.substring(1, raw.length() - 1);
                    }
                    result.put(key, new OutputEntry(raw, "string", false));
                } catch (Exception ignored) {
                    // 개별 key 파싱 실패는 스킵
                }
            }
            if (!result.isEmpty()) {
                log.info("Terraform outputs (Secret): crName={}, secretName={}, keys={}",
                        crName, secretName, result.keySet());
            } else {
                log.debug("Terraform output Secret이 비어있거나 없음: crName={}, secretName={}", crName, secretName);
            }
            return result;
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("Terraform output Secret 없음 (아직 미생성): crName={}", crName);
                return Map.of();
            }
            log.error("Terraform output Secret 조회 실패: crName={}, status={}", crName, e.getStatusCode());
            return Map.of();
        } catch (Exception e) {
            log.error("Terraform output Secret 파싱 실패: crName={}, error={}", crName, e.getMessage());
            return Map.of();
        }
    }

    // -------------------------------------------------------------------------
    // CR 빌더
    // -------------------------------------------------------------------------

    private Map<String, Object> buildCrMap(ProvisionRequest request) {
        Map<String, Object> annotations = new LinkedHashMap<>();
        annotations.put("kustomize.toolkit.fluxcd.io/prune", "disabled");

        Map<String, Object> labels = new LinkedHashMap<>();
        labels.put("app.opencsp.io/user-id", request.getUserId());
        labels.put("app.opencsp.io/module-type", request.getModuleType());

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", request.getCrName());
        metadata.put("namespace", fluxNamespace);
        metadata.put("annotations", annotations);
        metadata.put("labels", labels);

        Map<String, Object> cr = new LinkedHashMap<>();
        cr.put("apiVersion", TERRAFORM_GROUP_VERSION);
        cr.put("kind", TERRAFORM_KIND);
        cr.put("metadata", metadata);
        cr.put("spec", buildSpec(request));
        return cr;
    }

    private Map<String, Object> buildSpec(ProvisionRequest request) {
        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("interval", interval);
        spec.put("approvePlan", "auto");
        spec.put("destroyResourcesOnDeletion", true);
        spec.put("path", request.getModulePath());
        spec.put("sourceRef", Map.of(
                "kind", "GitRepository",
                "name", request.getGitRepositoryName(),
                "namespace", gitRepositoryNamespace
        ));
        spec.put("runnerPodTemplate", buildRunnerPodTemplate());
        spec.put("varsFrom", List.of(Map.of("kind", "Secret", "name", varsFromSecret)));
        spec.put("vars", toVarsList(request.getVars()));
        // outputs을 Secret에 저장: getOutputs()에서 "tf-output-{crName}" Secret을 읽음
        spec.put("writeOutputsToSecret", Map.of("name", "tf-output-" + request.getCrName()));
        return spec;
    }

    private Map<String, Object> buildRunnerPodTemplate() {
        Map<String, Object> secret = new LinkedHashMap<>();
        secret.put("secretName", runnerSshSecret);
        secret.put("defaultMode", 292); // 0444 octal

        Map<String, Object> volume = new LinkedHashMap<>();
        volume.put("name", "ssh-key");
        volume.put("secret", secret);

        Map<String, Object> volumeMount = new LinkedHashMap<>();
        volumeMount.put("name", "ssh-key");
        volumeMount.put("mountPath", "/home/runner/.ssh");
        volumeMount.put("readOnly", true);

        Map<String, Object> podSpec = new LinkedHashMap<>();
        podSpec.put("volumes", List.of(volume));
        podSpec.put("volumeMounts", List.of(volumeMount));

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("spec", podSpec);
        return template;
    }

    private List<Map<String, Object>> toVarsList(Map<String, Object> vars) {
        return vars.entrySet().stream()
                .map(e -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("name", e.getKey());
                    entry.put("value", e.getValue());
                    return entry;
                })
                .toList();
    }

    // -------------------------------------------------------------------------
    // 헬퍼
    // -------------------------------------------------------------------------

    private String terraformUri(String namespace) {
        return "/apis/infra.contrib.fluxcd.io/v1alpha2/namespaces/" + namespace + "/" + TERRAFORM_PLURAL;
    }

    private WebClient createWebClient() {
        try {
            SslContext sslContext = trustCerts
                    ? SslContextBuilder.forClient().trustManager(InsecureTrustManagerFactory.INSTANCE).build()
                    : SslContextBuilder.forClient().build();

            HttpClient httpClient = HttpClient.create().secure(ssl -> ssl.sslContext(sslContext));

            return webClientBuilder.clone()
                    .clientConnector(new ReactorClientHttpConnector(httpClient))
                    .baseUrl(apiServer)
                    .defaultHeader("Authorization", "Bearer " + token)
                    .defaultHeader("Content-Type", "application/json")
                    .build();
        } catch (SSLException e) {
            throw new RuntimeException("K8s WebClient SSL 설정 실패", e);
        }
    }
}
