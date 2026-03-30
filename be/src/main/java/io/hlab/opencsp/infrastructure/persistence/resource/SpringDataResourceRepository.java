package io.hlab.opencsp.infrastructure.persistence.resource;

import io.hlab.opencsp.domain.resource.Resource;
import io.hlab.opencsp.domain.resource.ResourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringDataResourceRepository extends JpaRepository<Resource, Long> {
    Optional<Resource> findByUuid(String uuid);
    Optional<Resource> findByCrName(String crName);
    List<Resource> findByUserId(String userId);
    List<Resource> findByNodeHostname(String nodeHostname);
    List<Resource> findByStatus(ResourceStatus status);
}
