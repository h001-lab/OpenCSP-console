package io.hlab.opencsp.domain.provision;

public enum ProvisionHistoryAction {
    /** 프로비저닝 최초 생성 */
    CREATED,
    /** 상태 전이 (PENDING → APPLYING → APPLIED → DESTROYING → DESTROYED 등) */
    STATUS_CHANGED
}
