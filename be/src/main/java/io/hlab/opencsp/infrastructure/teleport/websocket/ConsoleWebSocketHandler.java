package io.hlab.opencsp.infrastructure.teleport.websocket;

import io.hlab.opencsp.application.console.ConsoleService;
import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.infrastructure.teleport.TeleportClient;
import io.hlab.opencsp.infrastructure.teleport.tsh.TshCertManager;
import io.hlab.opencsp.infrastructure.teleport.tsh.TshSshSession;
import java.net.URI;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

/**
 * WebSocket 프록시 핸들러 (tsh 임시 구현).
 *
 * <p>FE(xterm.js) ↔ BE(이 핸들러) ↔ JSch SSH ↔ Teleport SSH Proxy(:3023)
 *
 * <p>Go Adapter 전환 시:
 * <ol>
 *   <li>{@code tsh/} 패키지 삭제</li>
 *   <li>이 파일에서 {@link TshCertManager}, {@link TshSshSession} 의존성 제거</li>
 *   <li>Teleport 부분을 Adapter WebSocket 프록시로 교체</li>
 * </ol>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConsoleWebSocketHandler extends AbstractWebSocketHandler {

    private final ConsoleService consoleService;
    private final TeleportClient teleportClient;
    private final TshCertManager tshCertManager;

    /** sessionId → SSH 세션 */
    private final ConcurrentHashMap<String, TshSshSession> sshSessions = new ConcurrentHashMap<>();
    /** Teleport → FE 릴레이 스레드 풀 */
    private final ExecutorService relayExecutor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "console-relay");
        t.setDaemon(true);
        return t;
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Spring WebSocket 이벤트
    // ──────────────────────────────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession clientSession) {
        String consoleSessionId = extractSessionId(clientSession.getUri());
        // HTTP 스레드에서는 iam_session_id(JWT jti)가 MDC에 있음 — console_session_id는 addKeyValue로 보완
        log.atInfo()
                .addKeyValue("console_session_id", consoleSessionId)
                .log("클라이언트 연결");

        ConsoleSession consoleSession = consoleService.findBySessionId(consoleSessionId).orElse(null);
        if (consoleSession == null) {
            log.atWarn()
                    .addKeyValue("console_session_id", consoleSessionId)
                    .log("세션을 찾을 수 없음");
            closeQuietly(clientSession, CloseStatus.BAD_DATA);
            return;
        }

        // WebSocket 핸드셰이크는 Bearer 헤더를 전달할 수 없어 MdcContextFilter가 동작하지 않는다.
        // HTTP REST로 세션 생성 시 저장해 둔 iamSessionId를 복원해 릴레이 스레드까지 전파한다.
        String storedSessionId = consoleSession.getIamSessionId();
        if (storedSessionId != null) {
            MDC.put("iam_session_id", storedSessionId);
        }

        // 릴레이 스레드로 넘기기 전에 HTTP 스레드 MDC 스냅샷 캡처
        Map<String, String> mdc = MDC.getCopyOfContextMap();

        relayExecutor.submit(() -> {
            if (mdc != null) MDC.setContextMap(mdc);
            MDC.put("console_session_id", consoleSessionId);
            try {
                tshCertManager.ensureCert();

                TshSshSession ssh = TshSshSession.connect(
                        tshCertManager.tshPath(),
                        tshCertManager.proxyAddr(),
                        consoleSession.getTeleportNodeId(),
                        consoleSession.getTeleportLogin()
                );
                sshSessions.put(consoleSessionId, ssh);
                consoleService.markActive(consoleSessionId);
                log.atInfo().log("SSH 연결 완료");

                // Teleport → FE 릴레이 루프 (별도 스레드, MDC 전달)
                startRelayLoop(consoleSessionId, ssh, clientSession, MDC.getCopyOfContextMap());

            } catch (Exception e) {
                log.atError().setCause(e).log("SSH 연결 실패");
                consoleService.markFailed(consoleSessionId, e.getMessage());
                closeQuietly(clientSession, CloseStatus.SERVER_ERROR);
            } finally {
                MDC.clear();
            }
        });
    }

    /** FE → SSH: 키 입력 바이트를 SSH stdin에 그대로 쓴다 */
    @Override
    protected void handleBinaryMessage(WebSocketSession clientSession, BinaryMessage message) {
        String consoleSessionId = extractSessionId(clientSession.getUri());
        TshSshSession ssh = sshSessions.get(consoleSessionId);
        if (ssh == null || !ssh.isAlive()) return;

        try {
            ByteBuffer payload = message.getPayload();
            byte[] bytes = new byte[payload.remaining()];
            payload.get(bytes);
            ssh.stdin().write(bytes);
            ssh.stdin().flush();
        } catch (Exception e) {
            log.atWarn()
                    .addKeyValue("console_session_id", consoleSessionId)
                    .setCause(e)
                    .log("SSH stdin 쓰기 실패");
        }
    }

    /** FE → SSH: resize 이벤트 */
    @Override
    protected void handleTextMessage(WebSocketSession clientSession, TextMessage message) {
        String consoleSessionId = extractSessionId(clientSession.getUri());
        TshSshSession ssh = sshSessions.get(consoleSessionId);
        if (ssh == null) return;

        String payload = message.getPayload();
        if (!payload.contains("resize")) return;

        try {
            com.fasterxml.jackson.databind.JsonNode node =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(payload);
            int cols = node.path("cols").asInt(80);
            int rows = node.path("rows").asInt(24);
            ssh.resize(cols, rows);
        } catch (Exception e) {
            log.atWarn()
                    .addKeyValue("console_session_id", consoleSessionId)
                    .setCause(e)
                    .log("resize 처리 실패");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession clientSession, CloseStatus status) {
        String consoleSessionId = extractSessionId(clientSession.getUri());
        log.atInfo()
                .addKeyValue("close_status", status.toString())
                .log("클라이언트 연결 종료");

        TshSshSession ssh = sshSessions.remove(consoleSessionId);
        if (ssh != null) ssh.close();
        consoleService.markDisconnected(consoleSessionId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SSH stdout → FE 릴레이
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * SSH stdout을 FE WebSocket으로 중계하는 루프.
     *
     * <p>MDC context (iam_session_id, console_session_id) must be set by the caller.
     * 별도 스레드로 실행되므로 캡처한 {@code mdc} 스냅샷을 전달받아 복원한다.
     */
    private void startRelayLoop(
            String consoleSessionId, TshSshSession ssh,
            WebSocketSession clientSession, Map<String, String> mdc) {
        relayExecutor.submit(() -> {
            if (mdc != null) MDC.setContextMap(mdc);
            try {
                byte[] buf = new byte[4096];
                int read;
                while (ssh.isAlive() && clientSession.isOpen()
                        && (read = ssh.stdout().read(buf)) != -1) {
                    byte[] data = java.util.Arrays.copyOf(buf, read);
                    synchronized (clientSession) {
                        clientSession.sendMessage(new BinaryMessage(data));
                    }
                }
            } catch (Exception e) {
                if (ssh.isAlive()) {
                    log.atWarn().setCause(e).log("SSH stdout 읽기 실패");
                }
            } finally {
                log.atInfo().log("릴레이 루프 종료");
                closeQuietly(clientSession, CloseStatus.NORMAL);
                TshSshSession s = sshSessions.remove(consoleSessionId);
                if (s != null) s.close();
                consoleService.markDisconnected(consoleSessionId);
                MDC.clear();
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 유틸
    // ──────────────────────────────────────────────────────────────────────────

    private static String extractSessionId(URI uri) {
        String path = uri.getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }

    private static void closeQuietly(WebSocketSession session, CloseStatus status) {
        try { session.close(status); } catch (Exception ignored) {}
    }
}
