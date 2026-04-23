package io.hlab.opencsp.domain.provision;

import java.time.LocalDateTime;
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

    /** 특정 유저의 기간 내 총 CPU 코어 할당량을 합산한다 (DESTROYED 제외). */
    int sumCpuCoresByUserIdAndCreatedAtBetween(String userId, LocalDateTime from, LocalDateTime to);
}
