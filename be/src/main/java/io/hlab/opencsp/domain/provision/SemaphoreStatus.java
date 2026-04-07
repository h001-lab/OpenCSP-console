package io.hlab.opencsp.domain.provision;

/** Semaphore post-provisioning 작업 상태 */
public enum SemaphoreStatus {
    /** Terraform apply 완료 전 — Semaphore 트리거 대기 */
    PENDING,
    /** Semaphore Task 실행 중 */
    RUNNING,
    /** Semaphore Task 완료 (성공) */
    SUCCESS,
    /** Semaphore Task 실패 */
    FAILED
}
