package io.hlab.opencsp.application.provision;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.domain.provision.ProvisionHistoryRepository;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 주기적으로 PENDING/APPLYING 상태의 Provision을 k8s와 동기화하고,
 * 오래된 이력(provision_histories)을 정리한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProvisionStatusSyncer {

    private final ProvisioningService provisioningService;
    private final ProvisionHistoryRepository provisionHistoryRepository;
    private final ConfigStore configStore;

    @Scheduled(fixedDelayString = "${app.provision.sync-interval-ms:30000}")
    public void sync() {
        log.debug("Provision 상태 동기화 시작");
        try {
            provisioningService.syncStatus();
        } catch (Exception e) {
            log.warn("Provision 상태 동기화 중 예외 발생: {}", e.getMessage());
        }
    }

    @Transactional
    @Scheduled(cron = "${app.provision.history-cleanup-cron:0 0 3 * * *}")
    public void cleanupHistory() {
        int retentionDays = Integer.parseInt(
                configStore.get(ConfigCategory.PROVISION, "history-retention-days", "90"));
        if (retentionDays <= 0) {
            log.debug("Provision 이력 정리 비활성화 (history-retention-days={})", retentionDays);
            return;
        }
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        int deleted = provisionHistoryRepository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("Provision 이력 정리 완료: {}건 삭제 ({}일 이전)", deleted, retentionDays);
        }
    }
}
