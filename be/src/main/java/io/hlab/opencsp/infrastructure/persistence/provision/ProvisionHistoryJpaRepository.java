package io.hlab.opencsp.infrastructure.persistence.provision;

import io.hlab.opencsp.domain.provision.ProvisionHistory;
import io.hlab.opencsp.domain.provision.ProvisionHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ProvisionHistoryJpaRepository implements ProvisionHistoryRepository {

    private final SpringDataProvisionHistoryRepository jpa;

    @Override
    @SuppressWarnings("null")
    public ProvisionHistory save(ProvisionHistory history) {
        return jpa.save(history);
    }

    @Override
    public List<ProvisionHistory> findByCrName(String crName) {
        return jpa.findByCrName(crName);
    }

    @Override
    public List<ProvisionHistory> findByUserId(String userId) {
        return jpa.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public int deleteOlderThan(LocalDateTime cutoff) {
        return jpa.deleteByCreatedAtBefore(cutoff);
    }
}
