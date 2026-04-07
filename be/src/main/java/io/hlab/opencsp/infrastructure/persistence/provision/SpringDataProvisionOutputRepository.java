package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.ProvisionOutput;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SpringDataProvisionOutputRepository extends JpaRepository<ProvisionOutput, Long> {
    List<ProvisionOutput> findByCrName(String crName);
    Optional<ProvisionOutput> findByCrNameAndOutputKey(String crName, String outputKey);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ProvisionOutput p WHERE p.crName = :crName")
    void deleteByCrName(String crName);
}
