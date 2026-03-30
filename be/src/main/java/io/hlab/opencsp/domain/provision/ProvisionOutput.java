package io.hlab.opencsp.domain.provision;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Terraform apply 완료 후 저장된 output 값.
 *
 * <p>tofu-controller CR의 {@code status.outputs}를 파싱해 저장한다.
 * Ansible Semaphore 인벤토리 생성, 콘솔 접속 등에 활용된다.
 *
 * <pre>
 * 대표적인 output 키:
 *   vm_ip        — 생성된 VM의 IP 주소
 *   vm_hostname  — VM 호스트명 (Teleport 노드명과 일치해야 함)
 *   vm_mac       — MAC 주소 (DHCP 예약 등에 활용)
 * </pre>
 */
@Entity
@Table(
    name = "provision_outputs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"cr_name", "output_key"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ProvisionOutput {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    /** 연결된 Provision의 CR 이름 */
    @Column(name = "cr_name", nullable = false, length = 253)
    private String crName;

    /** Terraform output 키 (e.g., "vm_ip", "vm_hostname") */
    @Column(name = "output_key", nullable = false, length = 255)
    private String outputKey;

    /** 출력 값 (문자열로 통합) */
    @Column(name = "output_value", columnDefinition = "TEXT")
    private String outputValue;

    /** Terraform output 타입 (e.g., "string", "number", "bool") */
    @Column(name = "output_type", length = 50)
    private String outputType;

    /** true 이면 sensitive output (Terraform 암호화 값) */
    @Column(name = "sensitive", nullable = false)
    private boolean sensitive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public static ProvisionOutput of(String crName, String outputKey,
                                     String outputValue, String outputType,
                                     boolean sensitive) {
        return ProvisionOutput.builder()
                .crName(crName)
                .outputKey(outputKey)
                .outputValue(outputValue)
                .outputType(outputType)
                .sensitive(sensitive)
                .build();
    }

    public void assignTenant(String tenantId) {
        this.tenantId = tenantId;
    }
}
