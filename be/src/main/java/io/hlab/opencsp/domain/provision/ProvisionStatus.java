package io.hlab.opencsp.domain.provision;

/**
 * Terraform CR의 라이프사이클 상태.
 * tofu-controller의 실제 상태를 기준으로 BE가 동기화한다.
 */
public enum ProvisionStatus {
    /** CR 생성 완료, tofu-controller가 아직 처리 시작 전 */
    PENDING,
    /** tofu-controller가 terraform apply 실행 중 */
    APPLYING,
    /** terraform apply 완료 — Ansible post-provisioning 대기 또는 진행 중 */
    APPLIED,
    /** Ansible 포함 전체 프로비저닝 완료 */
    READY,
    /** 오류 발생 */
    FAILED,
    /** terraform destroy 진행 중 */
    DESTROYING,
    /** 삭제 완료 */
    DESTROYED
}
