package io.hlab.opencsp.domain.provision;

import java.time.LocalDateTime;
import java.util.List;

public interface ProvisionHistoryRepository {
    ProvisionHistory save(ProvisionHistory history);
    List<ProvisionHistory> findByCrName(String crName);
    List<ProvisionHistory> findByUserId(String userId);
    /** createdAt이 cutoff보다 오래된 이력 삭제 (스케줄러용) */
    int deleteOlderThan(LocalDateTime cutoff);
}
