package io.hlab.opencsp.infrastructure.teleport.websocket;

import io.hlab.opencsp.application.console.ConsoleService;
import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.infrastructure.teleport.TeleportClient;
import io.hlab.opencsp.infrastructure.teleport.tsh.TshCertManager;
import io.hlab.opencsp.infrastructure.teleport.tsh.TshSshSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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

    private final ConsoleService   consoleService;
    private final TeleportClient   teleportClient;
    private final TshCertManager   tshCertManager;

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
        String sessionId = extractSessionId(clientSession.getUri());
        log.info("[Console] 클라이언트 연결: sessionId={}", sessionId);

        ConsoleSession consoleSession = consoleService.findBySessionId(sessionId).orElse(null);
        if (consoleSession == null) {
            log.warn("[Console] 세션을 찾을 수 없음: sessionId={}", sessionId);
            closeQuietly(clientSession, CloseStatus.BAD_DATA);
            return;
        }

        // tsh 인증서 확인/갱신 후 SSH 연결 (블로킹 — 최초 login에만 오래 걸림)
        relayExecutor.submit(() -> {
            try {
                tshCertManager.ensureCert();

                TshSshSession ssh = TshSshSession.connect(
                        tshCertManager.tshPath(),
                        tshCertManager.proxyAddr(),
                        consoleSession.getTeleportNodeId(),
                        consoleSession.getTeleportLogin()
                );
                sshSessions.put(sessionId, ssh);
                consoleService.markActive(sessionId);
                log.info("[Console] SSH 연결 완료: sessionId={}", sessionId);

                // Teleport → FE 릴레이 루프
                startRelayLoop(sessionId, ssh, clientSession);

            } catch (Exception e) {
                log.error("[Console] SSH 연결 실패: sessionId={}", sessionId, e);
                consoleService.markFailed(sessionId, e.getMessage());
                closeQuietly(clientSession, CloseStatus.SERVER_ERROR);
            }
        });
    }

    /** FE → SSH: 키 입력 바이트를 SSH stdin에 그대로 쓴다 */
    @Override
    protected void handleBinaryMessage(WebSocketSession clientSession, BinaryMessage message) {
        String sessionId = extractSessionId(clientSession.getUri());
        TshSshSession ssh = sshSessions.get(sessionId);
        if (ssh == null || !ssh.isAlive()) return;

        try {
            ByteBuffer payload = message.getPayload();
            byte[] bytes = new byte[payload.remaining()];
            payload.get(bytes);
            ssh.stdin().write(bytes);
            ssh.stdin().flush();
        } catch (Exception e) {
            log.warn("[Console] SSH stdin 쓰기 실패: sessionId={}", sessionId, e);
        }
    }

    /** FE → SSH: resize 이벤트 */
    @Override
    protected void handleTextMessage(WebSocketSession clientSession, TextMessage message) {
        String sessionId = extractSessionId(clientSession.getUri());
        TshSshSession ssh = sshSessions.get(sessionId);
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
            log.warn("[Console] resize 처리 실패: sessionId={}", sessionId, e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession clientSession, CloseStatus status) {
        String sessionId = extractSessionId(clientSession.getUri());
        log.info("[Console] 클라이언트 연결 종료: sessionId={}, status={}", sessionId, status);

        TshSshSession ssh = sshSessions.remove(sessionId);
        if (ssh != null) ssh.close();
        consoleService.markDisconnected(sessionId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SSH stdout → FE 릴레이
    // ──────────────────────────────────────────────────────────────────────────

    private void startRelayLoop(String sessionId, TshSshSession ssh, WebSocketSession clientSession) {
        relayExecutor.submit(() -> {
            byte[] buf = new byte[4096];
            try {
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
                    log.warn("[Console] SSH stdout 읽기 실패: sessionId={}", sessionId, e);
                }
            } finally {
                log.info("[Console] 릴레이 루프 종료: sessionId={}", sessionId);
                closeQuietly(clientSession, CloseStatus.NORMAL);
                TshSshSession s = sshSessions.remove(sessionId);
                if (s != null) s.close();
                consoleService.markDisconnected(sessionId);
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
