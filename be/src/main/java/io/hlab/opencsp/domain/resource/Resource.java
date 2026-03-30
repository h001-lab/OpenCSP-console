package io.hlab.opencsp.domain.resource;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 프로비저닝으로 생성된 VM/컨테이너 리소스.
 * <p>
 * Provision(Terraform CR 라이프사이클)과 crName으로 연결된다.
 * vars 필드에 Terraform 입력값을 보존하여 CR 복구에 사용한다.
 */
@Entity
@Table(name = "resources")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    @Column(nullable = false, unique = true, length = 36)
    private String uuid;

    /** 배포된 노드 호스트명 (nullable — 프로비저닝 전 or 노드 미등록 시) */
    @Column(name = "node_hostname", length = 255)
    private String nodeHostname;

    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    @Column(name = "vm_name", nullable = false, length = 255)
    private String vmName;

    /** VM IP (프로비저닝 완료 후 할당, nullable) */
    @Column(name = "vm_ip", length = 64)
    private String vmIp;

    /** Proxmox VM ID (nullable) */
    @Column(name = "vm_id")
    private Integer vmId;

    @Column(name = "cpu_cores")
    private Integer cpuCores;

    /** RAM (MiB) */
    @Column(name = "memory_mb")
    private Integer memoryMb;

    /** 디스크 (GiB) */
    @Column(name = "disk_gb")
    private Integer diskGb;

    /** Terraform CR 이름 — Provision.crName과 매핑 */
    @Column(name = "cr_name", length = 253)
    private String crName;

    @Column(name = "module_type", length = 100)
    private String moduleType;

    @Column(name = "namespace", length = 253)
    private String namespace;

    @Column(name = "git_repository_name", length = 253)
    private String gitRepositoryName;

    /**
     * Terraform vars JSON 문자열.
     * CR 재생성(복구) 시 사용한다.
     */
    @Column(name = "vars", columnDefinition = "TEXT")
    private String vars;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResourceStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (uuid == null) uuid = UUID.randomUUID().toString();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public static Resource create(String userId, String vmName, String crName,
                                  String moduleType, String namespace,
                                  String gitRepositoryName, String vars) {
        return Resource.builder()
                .userId(userId)
                .vmName(vmName)
                .crName(crName)
                .moduleType(moduleType)
                .namespace(namespace)
                .gitRepositoryName(gitRepositoryName)
                .vars(vars)
                .status(ResourceStatus.PROVISIONING)
                .build();
    }

    public void updateStatus(ResourceStatus status) {
        this.status = status;
    }

    public void assignNode(String nodeHostname) {
        this.nodeHostname = nodeHostname;
    }

    public void assignVmInfo(String vmIp, Integer vmId) {
        this.vmIp = vmIp;
        this.vmId = vmId;
    }

    public void assignSpec(Integer cpuCores, Integer memoryMb, Integer diskGb) {
        this.cpuCores = cpuCores;
        this.memoryMb = memoryMb;
        this.diskGb = diskGb;
    }

    public void assignTenant(String tenantId) {
        this.tenantId = tenantId;
    }
}
