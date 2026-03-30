package io.hlab.opencsp.infrastructure.persistence.resource;

import io.hlab.opencsp.domain.resource.Resource;
import io.hlab.opencsp.domain.resource.ResourceRepository;
import io.hlab.opencsp.domain.resource.ResourceStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ResourceJpaRepository implements ResourceRepository {

    private final SpringDataResourceRepository jpa;

    @Override public Resource save(Resource resource) { return jpa.save(resource); }
    @Override public Optional<Resource> findById(Long id) { return jpa.findById(id); }
    @Override public Optional<Resource> findByUuid(String uuid) { return jpa.findByUuid(uuid); }
    @Override public Optional<Resource> findByCrName(String crName) { return jpa.findByCrName(crName); }
    @Override public List<Resource> findAll() { return jpa.findAll(); }
    @Override public List<Resource> findByUserId(String userId) { return jpa.findByUserId(userId); }
    @Override public List<Resource> findByNodeHostname(String nodeHostname) { return jpa.findByNodeHostname(nodeHostname); }
    @Override public List<Resource> findByStatus(ResourceStatus status) { return jpa.findByStatus(status); }
    @Override public void deleteById(Long id) { jpa.deleteById(id); }
}
