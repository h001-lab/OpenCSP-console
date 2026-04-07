package io.hlab.opencsp.infrastructure.semaphore;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Semaphore 미설정 시 사용되는 No-Op 구현체.
 * SEMAPHORE 카테고리에 semaphore.url이 없으면 post-provisioning을 건너뛴다.
 */
@Slf4j
@Component
@ConditionalOnMissingBean(SemaphoreHttpClient.class)
public class NoOpSemaphoreClient implements SemaphoreClient {

    @Override
    public boolean isConfigured() { return false; }

    @Override
    public PostProvisionResult triggerPostProvisionJob(String crName, Map<String, String> outputs) {
        log.warn("[Semaphore] 미설정 상태 — post-provisioning 건너뜀: crName={}", crName);
        return new PostProvisionResult(-1, -1, -1, -1, -1);
    }

    @Override
    public void cleanupPostProvision(int sshKeyId, int templateId, int inventoryId, int environmentId) {
        log.debug("[Semaphore] 미설정 상태 — cleanup 건너뜀");
    }

    @Override
    public TaskResult getTaskResult(int taskId) {
        return new TaskResult("noop", false, "Semaphore not configured");
    }
}
