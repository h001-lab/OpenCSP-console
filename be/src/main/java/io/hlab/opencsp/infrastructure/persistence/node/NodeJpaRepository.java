package io.hlab.opencsp.infrastructure.persistence.node;

import io.hlab.opencsp.domain.node.Node;
import io.hlab.opencsp.domain.node.NodeRepository;
import io.hlab.opencsp.domain.node.NodeStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class NodeJpaRepository implements NodeRepository {

    private final SpringDataNodeRepository jpa;

    @Override public Node save(Node node) { return jpa.save(node); }
    @Override public Optional<Node> findById(Long id) { return jpa.findById(id); }
    @Override public Optional<Node> findByUuid(String uuid) { return jpa.findByUuid(uuid); }
    @Override public Optional<Node> findByHostname(String hostname) { return jpa.findByHostname(hostname); }
    @Override public List<Node> findAll() { return jpa.findAll(); }
    @Override public List<Node> findByStatus(NodeStatus status) { return jpa.findByStatus(status); }
    @Override public void deleteById(Long id) { jpa.deleteById(id); }
}
