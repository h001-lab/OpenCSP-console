package io.hlab.opencsp.infrastructure.persistence.node;

import io.hlab.opencsp.domain.node.Node;
import io.hlab.opencsp.domain.node.NodeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringDataNodeRepository extends JpaRepository<Node, Long> {
    Optional<Node> findByUuid(String uuid);
    Optional<Node> findByHostname(String hostname);
    List<Node> findByStatus(NodeStatus status);
}
