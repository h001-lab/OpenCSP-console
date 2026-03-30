package io.hlab.opencsp.application.node;

import io.hlab.opencsp.domain.node.Node;
import io.hlab.opencsp.domain.node.NodeRepository;
import io.hlab.opencsp.domain.node.NodeStatus;
import io.hlab.opencsp.domain.node.NodeType;
import java.util.List;
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

    @Transactional
    public Node create(String hostname, String ip, NodeType type, String description) {
        return nodeRepository.save(Node.create(hostname, ip, type, description));
    }

    @Transactional
    public Node updateStatus(String uuid, NodeStatus status) {
        Node node = nodeRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + uuid));
        node.updateStatus(status);
        return nodeRepository.save(node);
    }

    @Transactional
    public void delete(String uuid) {
        Node node = nodeRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + uuid));
        nodeRepository.deleteById(node.getId());
    }
}
