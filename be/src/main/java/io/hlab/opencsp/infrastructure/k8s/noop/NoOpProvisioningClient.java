package io.hlab.opencsp.infrastructure.k8s.noop;

import io.hlab.opencsp.infrastructure.k8s.ProvisionRequest;
import io.hlab.opencsp.infrastructure.k8s.ProvisioningClient;
import java.util.Map;
import java.util.HashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * app.k8s.enabled=false (기본값) 일 때 활성화되는 No-op 구현체.
 * 실제 k8s 호출 없이 경고 로그만 출력한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.k8s.enabled", havingValue = "false", matchIfMissing = true)
public class NoOpProvisioningClient implements ProvisioningClient {

    @Override
    public String provision(ProvisionRequest request) {
        log.warn("*** K8s not configured (app.k8s.enabled=false). " +
                 "Skipping Terraform CR creation for module='{}', crName='{}'. " +
                 "Set APP_K8S_ENABLED=true with valid kubeconfig for production. ***",
                 request.getModuleType(), request.getCrName());
        return request.getCrName();
    }

    @Override
    public void destroy(String crName) {
        log.warn("*** K8s not configured. Skipping destroy for CR='{}'. ***", crName);
    }

    @Override
    public Map<String, Object> getStatus(String crName) {
        log.warn("*** K8s not configured. Returning mock status for CR='{}'. ***", crName);
        return Map.of("status", "NOOP", "message", "K8s integration disabled");
    }

    @Override
    public Map<String, Map<String, Object>> listAllStatus(String namespace) {
        return new HashMap<>();
    }

    @Override
    public void forceDelete(String crName) {
        log.warn("*** K8s not configured. Skipping force delete for CR='{}'. ***", crName);
    }

    @Override
    public java.util.Map<String, ProvisioningClient.OutputEntry> getOutputs(String crName) {
        log.warn("*** K8s not configured. Returning empty outputs for CR='{}'. ***", crName);
        return java.util.Map.of();
    }

    @Override
    public java.util.List<ProvisioningClient.CrMeta> listAllCrMeta(String namespace) {
        return java.util.List.of();
    }

    @Override
    public void deleteTfStateSecret(String crName) {
        log.warn("*** K8s not configured. Skipping tfstate secret deletion for CR='{}'. ***", crName);
    }
}
