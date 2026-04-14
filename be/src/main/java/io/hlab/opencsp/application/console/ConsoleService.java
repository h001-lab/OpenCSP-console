package io.hlab.opencsp.application.console;

import io.hlab.opencsp.application.billing.BillingService;
import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.domain.console.ConsoleSessionRepository;
import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionRepository;
import io.hlab.opencsp.infrastructure.teleport.TeleportClient;
import io.hlab.opencsp.infrastructure.teleport.TeleportNodeInfo;
import io.hlab.opencsp.infrastructure.teleport.tsh.TshCertManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsoleService {

    private final ConsoleSessionRepository consoleSessionRepository;
    private final ProvisionRepository provisionRepository;
    private final TeleportClient teleportClient;
    private final TshCertManager tshCertManager;
    private final BillingService billingService;

    /**
     * 콘솔 세션을 생성한다.
     * <p>
     * Teleport에서 노드 UUID를 조회하고 ConsoleSession을 DB에 저장한 뒤 sessionId를 반환한다.
     * WebSocket 연결은 이후 클라이언트가 {@code /api/console/ws/{sessionId}} 에 접속할 때 수립된다.
     *
     * @param userId  접속 사용자 ID
     * @param crName  대상 인스턴스 CR 이름
     * @param login   SSH 로그인 계정 (기본값: "root")
     */
    @Transactional
    public ConsoleSessionDto createSession(String userId, String crName, String login) {
        if (!teleportClient.isConfigured()) {
            throw new IllegalStateException("Teleport가 설정되지 않았습니다. 관리자에게 문의하세요.");
        }

        // Provision에서 VM 호스트명 조회
        Provision provision = provisionRepository.findByCrName(crName)
                .orElseThrow(() -> new IllegalArgumentException("Provision을 찾을 수 없습니다: " + crName));

        String vmHostname = provision.getVmHostname();
        if (vmHostname == null || vmHostname.isBlank()) {
            throw new IllegalStateException("VM 호스트명이 없습니다. Teleport 연결 불가: crName=" + crName);
        }

        // Teleport 노드 조회 — tsh ls 사용 (임시: Go Adapter 전환 시 교체)
        TeleportNodeInfo nodeInfo = tshCertManager.findNodeByHostname(vmHostname)
                .orElseThrow(() -> new IllegalStateException(
                        "Teleport에서 노드를 찾을 수 없습니다: hostname=" + vmHostname));

        String teleportSessionId = UUID.randomUUID().toString();
        String effectiveLogin = (login != null && !login.isBlank()) ? login : "root";
        String iamSessionId = MDC.get("iam_session_id");

        ConsoleSession session = ConsoleSession.create(
                userId, crName, vmHostname,
                nodeInfo.getId(), effectiveLogin, teleportSessionId,
                iamSessionId
        );
        consoleSessionRepository.save(session);

        log.atInfo()
                .addKeyValue("console_session_id", session.getSessionId())
                .addKeyValue("user_id", userId)
                .addKeyValue("cr_name", crName)
                .addKeyValue("node_hostname", vmHostname)
                .addKeyValue("ssh_login", effectiveLogin)
                .log("콘솔 세션 생성");

        return new ConsoleSessionDto(
                session.getSessionId(),
                vmHostname,
                nodeInfo.getId(),
                effectiveLogin,
                teleportSessionId,
                crName
        );
    }

    public Optional<ConsoleSession> findBySessionId(String sessionId) {
        return consoleSessionRepository.findBySessionId(sessionId);
    }

    public List<ConsoleSession> listByUser(String userId) {
        return consoleSessionRepository.findByUserId(userId);
    }

    @Transactional
    public void markActive(String sessionId) {
        consoleSessionRepository.findBySessionId(sessionId).ifPresent(s -> {
            // 방어 로직: PENDING 아니면 상태 변경 안 함 (이미 ACTIVE이거나 FAILED/COMPLETED인 경우)
            if (s.getStatus() != io.hlab.opencsp.domain.console.ConsoleSessionStatus.PENDING) {
                return; 
            }
            s.markActive();
            consoleSessionRepository.save(s);
            try {
                billingService.recordConsoleSessionStarted(s.getUserId(), s.getSessionId(), s.getProvisionCrName());
            } catch (Exception e) {
                log.atWarn().setCause(e).log("콘솔 세션 과금 기록 실패 (무시)");
            }
        });
    }

    @Transactional
    public void markDisconnected(String sessionId) {
        consoleSessionRepository.findBySessionId(sessionId).ifPresent(s -> {
            if (s.getStatus() == io.hlab.opencsp.domain.console.ConsoleSessionStatus.ACTIVE) {
                s.markDisconnected();
                consoleSessionRepository.save(s);
                try {
                    billingService.recordConsoleSessionEnded(s);
                } catch (Exception e) {
                    log.atWarn().setCause(e).log("콘솔 세션 종료 과금 기록 실패 (무시)");
                }
            } else {
                log.atDebug().addKeyValue("console_session_id", sessionId).log("이미 종료 처리된 세션입니다. 스킵.");
            }
        });
    }

    @Transactional
    public void markFailed(String sessionId, String errorMessage) {
        consoleSessionRepository.findBySessionId(sessionId).ifPresent(s -> {
            s.markFailed(errorMessage);
            consoleSessionRepository.save(s);
        });
    }

    /** DTO: createSession 결과 */
    public record ConsoleSessionDto(
            String sessionId,
            String nodeHostname,
            String teleportNodeId,
            String login,
            String teleportSessionId,
            String provisionCrName
    ) {}
}
