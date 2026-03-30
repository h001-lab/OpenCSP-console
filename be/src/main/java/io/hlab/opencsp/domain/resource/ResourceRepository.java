package io.hlab.opencsp.domain.resource;

import java.util.List;
import java.util.Optional;

public interface ResourceRepository {
    Resource save(Resource resource);
    Optional<Resource> findById(Long id);
    Optional<Resource> findByUuid(String uuid);
    Optional<Resource> findByCrName(String crName);
    List<Resource> findAll();
    List<Resource> findByUserId(String userId);
    List<Resource> findByNodeHostname(String nodeHostname);
    List<Resource> findByStatus(ResourceStatus status);
    void deleteById(Long id);
}
