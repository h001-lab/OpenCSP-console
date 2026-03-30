package io.hlab.opencsp.domain.node;

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
}
