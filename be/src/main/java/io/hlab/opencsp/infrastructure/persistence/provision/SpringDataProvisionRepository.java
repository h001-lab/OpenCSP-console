package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SpringDataProvisionRepository extends JpaRepository<Provision, Long> {
    Optional<Provision> findByCrName(String crName);
    List<Provision> findByUserId(String userId);
    List<Provision> findByStatus(ProvisionStatus status);
    void deleteByCrName(String crName);

    @Query("SELECT MAX(p.vmId) FROM Provision p WHERE p.vmId IS NOT NULL")
    Optional<Long> findMaxVmId();
}
