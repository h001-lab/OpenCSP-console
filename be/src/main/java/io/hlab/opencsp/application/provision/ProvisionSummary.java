package io.hlab.opencsp.application.provision;

import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import io.hlab.opencsp.domain.provision.SemaphoreStatus;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProvisionSummary {

    private final Long id;
    /** 전체 워크플로우(Terraform + Semaphore) 추적 ID */
    private final String provisionTaskId;
    private final String crName;
    private final String moduleType;
    private final String userId;
    private final Long vmId;
    private final String proxmoxNode;
    private final String vmHostname;
    private final ProvisionStatus status;
    /** Semaphore post-provisioning 상태 (null = Semaphore 미설정) */
    private final SemaphoreStatus semaphoreStatus;
    /** Semaphore Task ID (semaphoreStatus != null인 경우) */
    private final Integer semaphoreTaskId;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    /** tofu-controller에서 가져온 실시간 상태 (k8s 연결 불가 시 null) */
    private final Map<String, Object> liveStatus;

    public static ProvisionSummary of(Provision provision, Map<String, Object> liveStatus) {
        return ProvisionSummary.builder()
                .id(provision.getId())
                .provisionTaskId(provision.getProvisionTaskId())
                .crName(provision.getCrName())
                .moduleType(provision.getModuleType())
                .userId(provision.getUserId())
                .vmId(provision.getVmId())
                .proxmoxNode(provision.getProxmoxNode())
                .vmHostname(provision.getVmHostname())
                .status(provision.getStatus())
                .semaphoreStatus(provision.getSemaphoreStatus())
                .semaphoreTaskId(provision.getSemaphoreTaskId())
                .createdAt(provision.getCreatedAt())
                .updatedAt(provision.getUpdatedAt())
                .liveStatus(liveStatus)
                .build();
    }
}
