package io.hlab.opencsp.domain.node;

import java.util.List;
import java.util.Optional;

public interface NodeRepository {
    Node save(Node node);
    Optional<Node> findById(Long id);
    Optional<Node> findByUuid(String uuid);
    Optional<Node> findByHostname(String hostname);
    List<Node> findAll();
    List<Node> findByStatus(NodeStatus status);
    void deleteById(Long id);
}
