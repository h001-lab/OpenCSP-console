package io.hlab.opencsp.api.provision.dto;

import io.hlab.opencsp.domain.provision.ProvisionHistory;
import io.hlab.opencsp.domain.provision.ProvisionHistoryAction;
import io.hlab.opencsp.domain.provision.ProvisionStatus;

import java.time.LocalDateTime;

public record ProvisionHistoryResponse(
        Long id,
        String crName,
        String userId,
        String moduleType,
        ProvisionHistoryAction action,
        ProvisionStatus fromStatus,
        ProvisionStatus toStatus,
        String detail,
        LocalDateTime createdAt
) {
    public static ProvisionHistoryResponse from(ProvisionHistory h) {
        return new ProvisionHistoryResponse(
                h.getId(),
                h.getCrName(),
                h.getUserId(),
                h.getModuleType(),
                h.getAction(),
                h.getFromStatus(),
                h.getToStatus(),
                h.getDetail(),
                h.getCreatedAt()
        );
    }
}
