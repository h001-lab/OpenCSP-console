package io.hlab.opencsp.domain.node;

import io.hlab.opencsp.infrastructure.config.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 인프라 노드 (Proxmox 호스트 등).
 * 노드 추가/격리/유지보수 관리에 사용된다.
 */
@Entity
@Table(name = "nodes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Node {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID. null = 공유 노드(모든 테넌트 사용 가능) */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    @Column(nullable = false, unique = true, length = 36)
    private String uuid;

    @Column(nullable = false, length = 255)
    private String hostname;

    /** 관리 IP (노드 자체 IP) */
    @Column(nullable = false, length = 64)
    private String ip;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NodeType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NodeStatus status;

    @Column(length = 500)
    private String description;

    // ─── Proxmox API 연동 ────────────────────────────────────────────────────

    /** Proxmox API 노드명 (짧은 호스트명). 비어 있으면 hostname 사용. */
    @Column(name = "proxmox_node", length = 100)
    private String proxmoxNode;

    /** Proxmox API 기본 URL (예: https://192.168.1.10:8006) */
    @Column(name = "api_url", length = 255)
    private String apiUrl;

    /** Proxmox API 토큰 (AES 암호화 저장). 형식: USER@REALM!TOKENID=UUID */
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "api_token", length = 1000)
    private String apiToken;

    // ─── 메트릭 (스케줄러가 주기적으로 갱신) ─────────────────────────────────

    @Column(name = "cpu_usage_percent")
    private Double cpuUsagePercent;

    @Column(name = "cpu_total")
    private Integer cpuTotal;

    @Column(name = "mem_used_bytes")
    private Long memUsedBytes;

    @Column(name = "mem_total_bytes")
    private Long memTotalBytes;

    @Column(name = "disk_used_bytes")
    private Long diskUsedBytes;

    @Column(name = "disk_total_bytes")
    private Long diskTotalBytes;

    @Column(name = "metrics_updated_at")
    private LocalDateTime metricsUpdatedAt;

    // ─── 타임스탬프 ──────────────────────────────────────────────────────────

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

    public static Node create(String hostname, String ip, NodeType type, String description) {
        return Node.builder()
                .hostname(hostname)
                .ip(ip)
                .type(type)
                .status(NodeStatus.ACTIVE)
                .description(description)
                .build();
    }

    public void updateStatus(NodeStatus status) {
        this.status = status;
    }

    public void assignTenant(String tenantId) {
        this.tenantId = tenantId;
    }

    /** API 크레덴셜 업데이트. apiToken 이 blank 이면 기존 값 유지. */
    public void updateCredentials(String proxmoxNode, String apiUrl, String apiToken) {
        this.proxmoxNode = proxmoxNode;
        this.apiUrl = apiUrl;
        if (apiToken != null && !apiToken.isBlank()) {
            this.apiToken = apiToken;
        }
    }

    /** 메트릭 갱신 (스케줄러 호출용). */
    public void updateMetrics(double cpuUsagePercent, int cpuTotal,
                              long memUsedBytes, long memTotalBytes,
                              long diskUsedBytes, long diskTotalBytes) {
        this.cpuUsagePercent = cpuUsagePercent;
        this.cpuTotal = cpuTotal;
        this.memUsedBytes = memUsedBytes;
        this.memTotalBytes = memTotalBytes;
        this.diskUsedBytes = diskUsedBytes;
        this.diskTotalBytes = diskTotalBytes;
        this.metricsUpdatedAt = LocalDateTime.now();
    }

    /** Proxmox API 호출 시 사용할 노드명. proxmoxNode 가 비어 있으면 hostname 반환. */
    public String effectiveProxmoxNode() {
        return (proxmoxNode != null && !proxmoxNode.isBlank()) ? proxmoxNode : hostname;
    }

    /** API 크레덴셜이 설정되어 있는지 여부. */
    public boolean hasApiCredentials() {
        return apiUrl != null && !apiUrl.isBlank()
                && apiToken != null && !apiToken.isBlank();
    }
}
