package io.hlab.opencsp.api.admin.node.dto;

import io.hlab.opencsp.domain.node.Node;
import io.hlab.opencsp.domain.node.NodeStatus;
import io.hlab.opencsp.domain.node.NodeType;
import java.time.LocalDateTime;

public record NodeResponse(
        Long id,
        String uuid,
        String hostname,
        String ip,
        NodeType type,
        NodeStatus status,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static NodeResponse from(Node node) {
        return new NodeResponse(
                node.getId(),
                node.getUuid(),
                node.getHostname(),
                node.getIp(),
                node.getType(),
                node.getStatus(),
                node.getDescription(),
                node.getCreatedAt(),
                node.getUpdatedAt()
        );
    }
}
