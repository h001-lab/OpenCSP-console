package io.hlab.opencsp.application.provision;

import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProvisionSummary {

    private final Long id;
    private final String crName;
    private final String moduleType;
    private final String userId;
    private final Long vmId;
    private final String proxmoxNode;
    private final String vmHostname;
    private final ProvisionStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    /** tofu-controller에서 가져온 실시간 상태 (k8s 연결 불가 시 null) */
    private final Map<String, Object> liveStatus;

    public static ProvisionSummary of(Provision provision, Map<String, Object> liveStatus) {
        return ProvisionSummary.builder()
                .id(provision.getId())
                .crName(provision.getCrName())
                .moduleType(provision.getModuleType())
                .userId(provision.getUserId())
                .vmId(provision.getVmId())
                .proxmoxNode(provision.getProxmoxNode())
                .vmHostname(provision.getVmHostname())
                .status(provision.getStatus())
                .createdAt(provision.getCreatedAt())
                .updatedAt(provision.getUpdatedAt())
                .liveStatus(liveStatus)
                .build();
    }
}
