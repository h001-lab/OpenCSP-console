package io.hlab.opencsp.infrastructure.teleport;

import java.net.URI;
import java.util.Optional;

/**
 * Teleport 프록시 연동 추상화.
 * <p>
 * 구현체: {@code TeleportHttpClient} (실제), {@code NoOpTeleportClient} (비설정 시)
 */
public interface TeleportClient {

    /** Teleport가 설정되어 있는지 여부 */
    boolean isConfigured();

    /** Teleport 세션 Bearer 토큰 반환 (만료 시 자동 갱신) */
    String getOrRefreshToken();

    /** 클러스터 이름 반환 */
    String getClusterName();

    /** hostname으로 Teleport 노드 조회 */
    Optional<TeleportNodeInfo> findNodeByHostname(String hostname);

    /**
     * Teleport SSH 터미널 WebSocket URI 생성.
     *
     * @param nodeId          Teleport 노드 UUID
     * @param login           SSH 로그인 (e.g., "root")
     * @param cols            터미널 너비 (컬럼)
     * @param rows            터미널 높이 (행)
     * @param teleportSessionId 녹화에 사용할 세션 UUID
     */
    URI buildSshWsUri(String nodeId, String login, int cols, int rows, String teleportSessionId);
}
