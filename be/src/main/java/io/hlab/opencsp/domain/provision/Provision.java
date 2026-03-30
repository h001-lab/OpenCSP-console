package io.hlab.opencsp.domain.provision;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "provisions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Provision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID. null = 단일 테넌트 모드 */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    /** Terraform CR 이름 (k8s 기준 식별자) */
    @Column(name = "cr_name", nullable = false, unique = true, length = 253)
    private String crName;

    @Column(name = "module_type", nullable = false, length = 100)
    private String moduleType;

    @Column(name = "namespace", nullable = false, length = 253)
    private String namespace;

    @Column(name = "git_repository_name", nullable = false, length = 253)
    private String gitRepositoryName;

    /** 요청한 사용자 ID (IAM subject) */
    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    /** Proxmox VM ID — proxmox-vm 모듈에서 사용, 중복 방지용 */
    @Column(name = "vm_id")
    private Long vmId;

    /** Proxmox 노드 호스트명 (proxmox-vm 모듈의 proxmox_node 값) */
    @Column(name = "proxmox_node", length = 255)
    private String proxmoxNode;

    /** VM 호스트명 (Terraform vars의 vm_name) — Teleport 노드 조회에 사용 */
    @Column(name = "vm_hostname", length = 255)
    private String vmHostname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProvisionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public static Provision create(String crName, String moduleType, String namespace,
                                   String gitRepositoryName, String userId, Long vmId,
                                   String proxmoxNode, String vmHostname) {
        return Provision.builder()
                .crName(crName)
                .moduleType(moduleType)
                .namespace(namespace)
                .gitRepositoryName(gitRepositoryName)
                .userId(userId)
                .vmId(vmId)
                .proxmoxNode(proxmoxNode)
                .vmHostname(vmHostname)
                .status(ProvisionStatus.PENDING)
                .build();
    }

    public void updateStatus(ProvisionStatus status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateVmHostname(String vmHostname) {
        this.vmHostname = vmHostname;
        this.updatedAt = LocalDateTime.now();
    }

    public void assignTenant(String tenantId) {
        this.tenantId = tenantId;
    }
}
