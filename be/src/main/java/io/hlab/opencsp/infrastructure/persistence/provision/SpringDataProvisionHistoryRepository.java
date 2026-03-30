package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.ProvisionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringDataProvisionHistoryRepository extends JpaRepository<ProvisionHistory, Long> {

    List<ProvisionHistory> findByCrName(String crName);

    List<ProvisionHistory> findByUserIdOrderByCreatedAtDesc(String userId);

    @Modifying
    @Query("DELETE FROM ProvisionHistory h WHERE h.createdAt < :cutoff")
    int deleteByCreatedAtBefore(@Param("cutoff") LocalDateTime cutoff);
}
