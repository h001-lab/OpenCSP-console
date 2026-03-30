package io.hlab.opencsp.domain.console;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 웹 터미널 콘솔 세션 레코드.
 * <p>
 * 사용자가 인스턴스에 접속한 이력을 기록하며, Teleport 세션 ID와 연결된다.
 * Teleport 측 세션 레코딩 및 audit과 별개로 OpenCSP 자체 audit log 역할을 한다.
 */
@Entity
@Table(name = "console_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ConsoleSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    /** OpenCSP 세션 식별자 (UUID) — WS 엔드포인트 경로에 사용 */
    @Column(name = "session_id", nullable = false, unique = true, length = 36)
    private String sessionId;

    /** 접속 사용자 (IAM subject) */
    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    /** 연결 대상 Provision의 CR 이름 */
    @Column(name = "provision_cr_name", length = 253)
    private String provisionCrName;

    /** 연결 대상 VM 호스트명 (Teleport 노드 조회 키) */
    @Column(name = "node_hostname", length = 255)
    private String nodeHostname;

    /** Teleport 내부 노드 UUID */
    @Column(name = "teleport_node_id", length = 36)
    private String teleportNodeId;

    /** SSH 로그인 (e.g., "root", "ubuntu") */
    @Column(name = "teleport_login", length = 100)
    private String teleportLogin;

    /** Teleport 세션 녹화 ID (Teleport 내부 식별자) */
    @Column(name = "teleport_session_id", length = 36)
    private String teleportSessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConsoleSessionStatus status;

    @Column(name = "connected_at", nullable = false, updatable = false)
    private LocalDateTime connectedAt;

    @Column(name = "disconnected_at")
    private LocalDateTime disconnectedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @PrePersist
    protected void onCreate() {
        if (sessionId == null) sessionId = UUID.randomUUID().toString();
        if (connectedAt == null) connectedAt = LocalDateTime.now();
    }

    public static ConsoleSession create(String userId, String provisionCrName,
                                        String nodeHostname, String teleportNodeId,
                                        String teleportLogin, String teleportSessionId) {
        return ConsoleSession.builder()
                .userId(userId)
                .provisionCrName(provisionCrName)
                .nodeHostname(nodeHostname)
                .teleportNodeId(teleportNodeId)
                .teleportLogin(teleportLogin)
                .teleportSessionId(teleportSessionId)
                .status(ConsoleSessionStatus.PENDING)
                .build();
    }

    public void markConnecting() {
        this.status = ConsoleSessionStatus.CONNECTING;
    }

    public void markActive() {
        this.status = ConsoleSessionStatus.ACTIVE;
    }

    public void markDisconnected() {
        this.status = ConsoleSessionStatus.DISCONNECTED;
        this.disconnectedAt = LocalDateTime.now();
    }

    public void markFailed(String errorMessage) {
        this.status = ConsoleSessionStatus.FAILED;
        this.disconnectedAt = LocalDateTime.now();
        this.errorMessage = errorMessage;
    }

    public void assignTenant(String tenantId) {
        this.tenantId = tenantId;
    }
}
