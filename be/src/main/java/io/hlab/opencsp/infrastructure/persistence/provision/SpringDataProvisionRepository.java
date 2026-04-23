package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import io.hlab.opencsp.domain.provision.SemaphoreStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SpringDataProvisionRepository extends JpaRepository<Provision, Long> {
    Optional<Provision> findByCrName(String crName);
    List<Provision> findByUserId(String userId);
    List<Provision> findByStatus(ProvisionStatus status);
    List<Provision> findBySemaphoreStatus(SemaphoreStatus semaphoreStatus);
    void deleteByCrName(String crName);

    @Query("SELECT MAX(p.vmId) FROM Provision p WHERE p.vmId IS NOT NULL")
    Optional<Long> findMaxVmId();

    @Query("SELECT COALESCE(SUM(p.cpuCores), 0) FROM Provision p " +
           "WHERE p.userId = :userId AND p.status <> 'DESTROYED' " +
           "AND p.createdAt >= :from AND p.createdAt < :to")
    int sumCpuCoresByUserIdAndPeriod(
            @Param("userId") String userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
