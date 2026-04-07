package io.hlab.opencsp.application.node;

import io.hlab.opencsp.domain.node.Node;
import io.hlab.opencsp.domain.node.NodeRepository;
import io.hlab.opencsp.domain.node.NodeStatus;
import io.hlab.opencsp.domain.node.NodeType;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NodeService {

    private final NodeRepository nodeRepository;

    public List<Node> findAll() {
        return nodeRepository.findAll();
    }

    public Optional<Node> findByUuid(String uuid) {
        return nodeRepository.findByUuid(uuid);
    }

    /** API 크레덴셜이 설정된 ACTIVE 노드만 반환 (메트릭 폴링 대상). 격리된 노드는 제외. */
    public List<Node> findAllWithCredentials() {
        return nodeRepository.findAll().stream()
                .filter(n -> n.getStatus() == NodeStatus.ACTIVE)
                .filter(Node::hasApiCredentials)
                .toList();
    }

    @Transactional
    public Node create(String hostname, String ip, NodeType type, String description,
                       String proxmoxNode, String apiUrl, String apiToken) {
        Node node = Node.create(hostname, ip, type, description);
        if ((apiUrl != null && !apiUrl.isBlank()) || (proxmoxNode != null && !proxmoxNode.isBlank())) {
            node.updateCredentials(proxmoxNode, apiUrl, apiToken);
        }
        return nodeRepository.save(node);
    }

    @Transactional
    public Node updateStatus(String uuid, NodeStatus status) {
        Node node = nodeRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + uuid));
        node.updateStatus(status);
        return nodeRepository.save(node);
    }

    @Transactional
    public Node updateCredentials(String uuid, String proxmoxNode, String apiUrl, String apiToken) {
        Node node = nodeRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + uuid));
        node.updateCredentials(proxmoxNode, apiUrl, apiToken);
        return nodeRepository.save(node);
    }

    @Transactional
    public void updateMetrics(String uuid, double cpuPercent, int cpuTotal,
                              long memUsed, long memTotal, long diskUsed, long diskTotal) {
        nodeRepository.findByUuid(uuid).ifPresent(node -> {
            node.updateMetrics(cpuPercent, cpuTotal, memUsed, memTotal, diskUsed, diskTotal);
            nodeRepository.save(node);
        });
    }

    @Transactional
    public void delete(String uuid) {
        Node node = nodeRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + uuid));
        nodeRepository.deleteById(node.getId());
    }
}
