package io.hlab.opencsp.infrastructure.websocket;

import io.hlab.opencsp.application.console.ConsoleService;
import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.infrastructure.teleport.TeleportClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.net.URI;
import java.net.http.HttpClient;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket 프록시 핸들러.
 *
 * <p>FE(xterm.js) ↔ BE(이 핸들러) ↔ Teleport SSH WebSocket 간 메시지를 양방향 릴레이한다.
 *
 * <h3>Teleport 메시지 프로토콜 (바이너리 프레임)</h3>
 * <pre>
 *   [0x70='p'] + raw PTY bytes  — 터미널 입출력 데이터
 *   [0x77='w'] + JSON           — 터미널 크기 변경 {"cols":80,"rows":24}
 * </pre>
 *
 * <h3>BE ↔ FE 메시지 (이 핸들러에서 envelope 제거/추가)</h3>
 * <ul>
 *   <li>FE → BE: 바이너리 프레임 = 키 입력 원본 bytes</li>
 *   <li>FE → BE: 텍스트 프레임 = JSON 리사이즈 {@code {"type":"resize","cols":80,"rows":24}}</li>
 *   <li>BE → FE: 바이너리 프레임 = PTY 출력 원본 bytes (Teleport envelope 제거됨)</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConsoleWebSocketHandler extends AbstractWebSocketHandler {

    /** Teleport PTY 데이터 타입 바이트 */
    private static final byte TYPE_PTY    = 'p';
    /** Teleport 터미널 리사이즈 타입 바이트 */
    private static final byte TYPE_RESIZE = 'w';

    private final ConsoleService  consoleService;
    private final TeleportClient  teleportClient;

    /** sessionId → Teleport WebSocket 연결 */
    private final ConcurrentHashMap<String, java.net.http.WebSocket> teleportSockets = new ConcurrentHashMap<>();
    /** sessionId → 클라이언트 WebSocket 세션 */
    private final ConcurrentHashMap<String, WebSocketSession>        clientSessions  = new ConcurrentHashMap<>();

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

        clientSessions.put(sessionId, clientSession);

        // Teleport WebSocket 비동기 연결
        URI teleportUri = teleportClient.buildSshWsUri(
                consoleSession.getTeleportNodeId(),
                consoleSession.getTeleportLogin(),
                80, 24,
                consoleSession.getTeleportSessionId()
        );
        String token = teleportClient.getOrRefreshToken();

        log.info("[Console] Teleport 연결 시도: sessionId={}, uri={}", sessionId, teleportUri);

        HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build()
                .newWebSocketBuilder()
                .header("X-Teleport-Auth", token)
                .buildAsync(teleportUri, new TeleportListener(sessionId, clientSession))
                .thenAccept(ws -> {
                    teleportSockets.put(sessionId, ws);
                    consoleService.markActive(sessionId);
                    log.info("[Console] Teleport 연결 완료: sessionId={}", sessionId);
                })
                .exceptionally(ex -> {
                    log.error("[Console] Teleport 연결 실패: sessionId={}", sessionId, ex);
                    consoleService.markFailed(sessionId, ex.getMessage());
                    closeQuietly(clientSession, CloseStatus.SERVER_ERROR);
                    return null;
                });
    }

    /** FE → Teleport: 키 입력 바이트 → Teleport 'p' envelope로 래핑 */
    @Override
    protected void handleBinaryMessage(WebSocketSession clientSession, BinaryMessage message) {
        String sessionId = extractSessionId(clientSession.getUri());
        java.net.http.WebSocket teleportWs = teleportSockets.get(sessionId);
        if (teleportWs == null) return;

        ByteBuffer payload = message.getPayload();
        ByteBuffer wrapped = ByteBuffer.allocate(payload.remaining() + 1);
        wrapped.put(TYPE_PTY);
        wrapped.put(payload);
        wrapped.flip();
        teleportWs.sendBinary(wrapped, true);
    }

    /** FE → Teleport: 리사이즈 JSON → Teleport 'w' envelope로 래핑 */
    @Override
    protected void handleTextMessage(WebSocketSession clientSession, TextMessage message) {
        String sessionId = extractSessionId(clientSession.getUri());
        java.net.http.WebSocket teleportWs = teleportSockets.get(sessionId);
        if (teleportWs == null) return;

        // {"type":"resize","cols":80,"rows":24} → 'w' + {"cols":80,"rows":24}
        String payload = message.getPayload();
        if (!payload.contains("resize")) return;

        try {
            // cols/rows 추출 후 Teleport 형식으로 변환
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(payload);
            int cols = node.path("cols").asInt(80);
            int rows = node.path("rows").asInt(24);
            String resizeJson = "{\"cols\":" + cols + ",\"rows\":" + rows + "}";
            byte[] jsonBytes = resizeJson.getBytes(StandardCharsets.UTF_8);
            byte[] wrapped = new byte[jsonBytes.length + 1];
            wrapped[0] = TYPE_RESIZE;
            System.arraycopy(jsonBytes, 0, wrapped, 1, jsonBytes.length);
            teleportWs.sendBinary(ByteBuffer.wrap(wrapped), true);
        } catch (Exception e) {
            log.warn("[Console] 리사이즈 메시지 처리 실패: sessionId={}", sessionId, e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession clientSession, CloseStatus status) {
        String sessionId = extractSessionId(clientSession.getUri());
        log.info("[Console] 클라이언트 연결 종료: sessionId={}, status={}", sessionId, status);
        clientSessions.remove(sessionId);

        java.net.http.WebSocket teleportWs = teleportSockets.remove(sessionId);
        if (teleportWs != null) {
            teleportWs.sendClose(1000, "client disconnected");
        }
        consoleService.markDisconnected(sessionId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Teleport WebSocket Listener (내부 클래스)
    // ──────────────────────────────────────────────────────────────────────────

    private class TeleportListener implements java.net.http.WebSocket.Listener {
        private final String        sessionId;
        private final WebSocketSession clientSession;

        TeleportListener(String sessionId, WebSocketSession clientSession) {
            this.sessionId     = sessionId;
            this.clientSession = clientSession;
        }

        @Override
        public void onOpen(java.net.http.WebSocket webSocket) {
            log.debug("[Console][Teleport] onOpen: sessionId={}", sessionId);
            webSocket.request(1);
        }

        /** Teleport → FE: 'p' envelope 제거 후 raw PTY bytes 전달 */
        @Override
        public CompletionStage<?> onBinary(java.net.http.WebSocket webSocket, ByteBuffer data, boolean last) {
            byte[] bytes = new byte[data.remaining()];
            data.get(bytes);

            if (bytes.length > 0 && bytes[0] == TYPE_PTY) {
                byte[] rawData = Arrays.copyOfRange(bytes, 1, bytes.length);
                if (rawData.length > 0 && clientSession.isOpen()) {
                    try {
                        synchronized (clientSession) {
                            clientSession.sendMessage(new BinaryMessage(rawData));
                        }
                    } catch (Exception e) {
                        log.warn("[Console][Teleport] FE 전송 실패: sessionId={}", sessionId, e);
                    }
                }
            }
            // TYPE_RESIZE 등 다른 타입은 무시

            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onText(java.net.http.WebSocket webSocket, CharSequence data, boolean last) {
            // Teleport가 텍스트 프레임을 보내는 경우 (에러 메시지 등)
            log.debug("[Console][Teleport] 텍스트 수신: sessionId={}, data={}", sessionId, data);
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onClose(java.net.http.WebSocket webSocket, int statusCode, String reason) {
            log.info("[Console][Teleport] 연결 종료: sessionId={}, code={}, reason={}", sessionId, statusCode, reason);
            if (clientSession.isOpen()) closeQuietly(clientSession, CloseStatus.NORMAL);
            consoleService.markDisconnected(sessionId);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void onError(java.net.http.WebSocket webSocket, Throwable error) {
            log.error("[Console][Teleport] 오류: sessionId={}", sessionId, error);
            if (clientSession.isOpen()) closeQuietly(clientSession, CloseStatus.SERVER_ERROR);
            consoleService.markFailed(sessionId, error.getMessage());
        }
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
