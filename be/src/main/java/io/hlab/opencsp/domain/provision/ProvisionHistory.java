package io.hlab.opencsp.domain.provision;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 프로비저닝 이력 레코드.
 * Provision이 DESTROYED 되어 provisions 테이블에서 삭제된 후에도 이력은 여기에 남는다.
 */
@Entity
@Table(name = "provision_histories", indexes = {
        @Index(name = "idx_ph_cr_name", columnList = "cr_name"),
        @Index(name = "idx_ph_user_id", columnList = "user_id"),
        @Index(name = "idx_ph_created_at", columnList = "created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProvisionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 전체 워크플로우 추적 ID — Provision.provisionTaskId 와 동일 */
    @Column(name = "provision_task_id", length = 36)
    private String provisionTaskId;

    /** Terraform CR 이름 — provisions 삭제 후에도 식별 가능하도록 단순 문자열로 보관 */
    @Column(name = "cr_name", nullable = false, length = 253)
    private String crName;

    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    @Column(name = "module_type", length = 100)
    private String moduleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProvisionHistoryAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private ProvisionStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 20)
    private ProvisionStatus toStatus;

    /** 부가 정보 (오류 메시지, 비고 등) */
    @Column(length = 1000)
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public static ProvisionHistory created(Provision provision) {
        return ProvisionHistory.builder()
                .provisionTaskId(provision.getProvisionTaskId())
                .crName(provision.getCrName())
                .userId(provision.getUserId())
                .tenantId(provision.getTenantId())
                .moduleType(provision.getModuleType())
                .action(ProvisionHistoryAction.CREATED)
                .toStatus(ProvisionStatus.PENDING)
                .build();
    }

    public static ProvisionHistory statusChanged(Provision provision, ProvisionStatus from, ProvisionStatus to) {
        return ProvisionHistory.builder()
                .provisionTaskId(provision.getProvisionTaskId())
                .crName(provision.getCrName())
                .userId(provision.getUserId())
                .tenantId(provision.getTenantId())
                .moduleType(provision.getModuleType())
                .action(ProvisionHistoryAction.STATUS_CHANGED)
                .fromStatus(from)
                .toStatus(to)
                .build();
    }

    public static ProvisionHistory statusChanged(Provision provision, ProvisionStatus from, ProvisionStatus to, String detail) {
        return ProvisionHistory.builder()
                .provisionTaskId(provision.getProvisionTaskId())
                .crName(provision.getCrName())
                .userId(provision.getUserId())
                .tenantId(provision.getTenantId())
                .moduleType(provision.getModuleType())
                .action(ProvisionHistoryAction.STATUS_CHANGED)
                .fromStatus(from)
                .toStatus(to)
                .detail(detail)
                .build();
    }
}
