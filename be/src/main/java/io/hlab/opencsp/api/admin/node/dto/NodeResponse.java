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
        String proxmoxNode,
        String apiUrl,
        boolean hasCredentials,
        Double cpuUsagePercent,
        Integer cpuTotal,
        Long memUsedBytes,
        Long memTotalBytes,
        Long diskUsedBytes,
        Long diskTotalBytes,
        LocalDateTime metricsUpdatedAt,
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
                node.getProxmoxNode(),
                node.getApiUrl(),
                node.hasApiCredentials(),
                node.getCpuUsagePercent(),
                node.getCpuTotal(),
                node.getMemUsedBytes(),
                node.getMemTotalBytes(),
                node.getDiskUsedBytes(),
                node.getDiskTotalBytes(),
                node.getMetricsUpdatedAt(),
                node.getCreatedAt(),
                node.getUpdatedAt()
        );
    }
}
