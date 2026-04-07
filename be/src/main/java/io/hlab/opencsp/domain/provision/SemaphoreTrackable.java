package io.hlab.opencsp.domain.provision;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;

/**
 * Semaphore post-provisioning 추적 컬럼을 제공하는 MappedSuperclass.
 * 프로비저닝 엔티티에만 적용된다.
 */
@MappedSuperclass
@Getter
public abstract class SemaphoreTrackable {

    @Column(name = "semaphore_ssh_key_id")
    private Integer semaphoreSshKeyId;

    @Column(name = "semaphore_inventory_id")
    private Integer semaphoreInventoryId;

    @Column(name = "semaphore_template_id")
    private Integer semaphoreTemplateId;

    @Column(name = "semaphore_task_id")
    private Integer semaphoreTaskId;

    @Column(name = "semaphore_environment_id")
    private Integer semaphoreEnvironmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "semaphore_status", length = 20)
    private SemaphoreStatus semaphoreStatus;

    public void assignSemaphoreIds(int sshKeyId, int inventoryId, int templateId, int taskId, int environmentId) {
        this.semaphoreSshKeyId     = sshKeyId;
        this.semaphoreInventoryId  = inventoryId;
        this.semaphoreTemplateId   = templateId;
        this.semaphoreTaskId       = taskId;
        this.semaphoreEnvironmentId = environmentId;
        this.semaphoreStatus       = SemaphoreStatus.RUNNING;
    }

    public void updateSemaphoreStatus(SemaphoreStatus status) {
        this.semaphoreStatus = status;
    }
}
