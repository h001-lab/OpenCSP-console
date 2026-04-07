package io.hlab.opencsp.domain.provision;

import java.util.List;
import java.util.Optional;

public interface ProvisionRepository {
    Provision save(Provision provision);
    Optional<Provision> findByCrName(String crName);
    List<Provision> findAll();
    List<Provision> findByUserId(String userId);
    List<Provision> findByStatus(ProvisionStatus status);
    List<Provision> findBySemaphoreStatus(SemaphoreStatus semaphoreStatus);
    void deleteByCrName(String crName);
    Optional<Long> findMaxVmId();
}
