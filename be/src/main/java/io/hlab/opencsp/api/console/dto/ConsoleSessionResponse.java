package io.hlab.opencsp.api.console.dto;

import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.domain.console.ConsoleSessionStatus;
import java.time.LocalDateTime;

public record ConsoleSessionResponse(
        String sessionId,
        String provisionCrName,
        String nodeHostname,
        String teleportLogin,
        ConsoleSessionStatus status,
        LocalDateTime connectedAt,
        LocalDateTime disconnectedAt
) {
    public static ConsoleSessionResponse from(ConsoleSession s) {
        return new ConsoleSessionResponse(
                s.getSessionId(),
                s.getProvisionCrName(),
                s.getNodeHostname(),
                s.getTeleportLogin(),
                s.getStatus(),
                s.getConnectedAt(),
                s.getDisconnectedAt()
        );
    }
}
