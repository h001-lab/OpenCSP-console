package io.hlab.opencsp.infrastructure.teleport.noop;

import io.hlab.opencsp.infrastructure.teleport.TeleportClient;
import io.hlab.opencsp.infrastructure.teleport.TeleportNodeInfo;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Optional;

/**
 * Teleport 미설정 시 사용되는 No-Op 구현체.
 * 콘솔 기능을 사용하려면 IAM 설정에서 teleport.proxy.url 등을 설정해야 한다.
 */
@Component
@ConditionalOnMissingBean(io.hlab.opencsp.infrastructure.teleport.http.TeleportHttpClient.class)
public class NoOpTeleportClient implements TeleportClient {

    @Override
    public boolean isConfigured() { return false; }

    @Override
    public String getOrRefreshToken() { throw notConfigured(); }

    @Override
    public String getSessionCookie() { return ""; }

    @Override
    public String getClusterName() { throw notConfigured(); }

    @Override
    public Optional<TeleportNodeInfo> findNodeByHostname(String hostname) { return Optional.empty(); }

@Override
    public URI buildSshWsUri(String nodeId, String login, int cols, int rows, String teleportSessionId) {
        throw notConfigured();
    }

    private IllegalStateException notConfigured() {
        return new IllegalStateException("Teleport가 설정되지 않았습니다. IAM 설정에서 teleport.proxy.url을 구성하세요.");
    }
}
