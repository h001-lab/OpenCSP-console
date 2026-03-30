package io.hlab.opencsp.infrastructure.teleport.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import io.hlab.opencsp.infrastructure.teleport.TeleportClient;
import io.hlab.opencsp.infrastructure.teleport.TeleportNodeInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Teleport Web API 클라이언트.
 *
 * <p>ConfigStore에서 아래 설정을 읽는다 (IAM 카테고리):
 * <ul>
 *   <li>{@code teleport.proxy.url}  — Teleport 프록시 주소 (예: https://teleport.example.com)</li>
 *   <li>{@code teleport.bot.user}   — Teleport 봇 계정 사용자명</li>
 *   <li>{@code teleport.bot.pass}   — Teleport 봇 계정 비밀번호</li>
 *   <li>{@code teleport.insecure}   — "true" 이면 TLS 검증 비활성화 (개발환경용)</li>
 * </ul>
 *
 * <p>세션 토큰은 메모리 캐시 후 만료 1시간 전 자동 갱신한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TeleportHttpClient implements TeleportClient {

    private final ConfigStore configStore;
    private final ObjectMapper objectMapper;

    private final AtomicReference<String> cachedToken    = new AtomicReference<>();
    private final AtomicReference<Instant> tokenExpiry   = new AtomicReference<>(Instant.EPOCH);
    private volatile String cachedClusterName;

    // ──────────────────────────────────────────────────────────────────────────
    // TeleportClient 구현
    // ──────────────────────────────────────────────────────────────────────────

    @Override
    public boolean isConfigured() {
        return configStore.get(ConfigCategory.IAM, "teleport.proxy.url").isPresent();
    }

    @Override
    public String getOrRefreshToken() {
        if (cachedToken.get() != null && Instant.now().isBefore(tokenExpiry.get())) {
            return cachedToken.get();
        }
        return refreshToken();
    }

    @Override
    public String getClusterName() {
        if (cachedClusterName != null) return cachedClusterName;
        try {
            String proxyUrl = requireProxyUrl();
            WebClient wc = buildWebClient(proxyUrl);
            String body = wc.get()
                    .uri("/v1/webapi/ping")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            JsonNode root = objectMapper.readTree(body);
            cachedClusterName = root.path("cluster_name").asText();
            log.info("Teleport 클러스터명: {}", cachedClusterName);
            return cachedClusterName;
        } catch (Exception e) {
            throw new IllegalStateException("Teleport cluster name 조회 실패", e);
        }
    }

    @Override
    public Optional<TeleportNodeInfo> findNodeByHostname(String hostname) {
        try {
            String proxyUrl  = requireProxyUrl();
            String cluster   = getClusterName();
            String token     = getOrRefreshToken();
            WebClient wc     = buildWebClient(proxyUrl);

            String body = wc.get()
                    .uri("/v1/webapi/sites/{cluster}/nodes", cluster)
                    .header("X-Teleport-Auth", token)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode items = objectMapper.readTree(body).path("items");
            if (items.isArray()) {
                for (JsonNode item : items) {
                    if (hostname.equalsIgnoreCase(item.path("hostname").asText())) {
                        return Optional.of(TeleportNodeInfo.builder()
                                .id(item.path("id").asText())
                                .hostname(item.path("hostname").asText())
                                .addr(item.path("addr").asText())
                                .clusterName(cluster)
                                .build());
                    }
                }
            }
            log.warn("Teleport에서 hostname='{}' 노드를 찾을 수 없음", hostname);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Teleport 노드 조회 실패: hostname={}", hostname, e);
            return Optional.empty();
        }
    }

    @Override
    public URI buildSshWsUri(String nodeId, String login, int cols, int rows, String teleportSessionId) {
        try {
            String proxyUrl = requireProxyUrl();
            String cluster  = getClusterName();

            // Teleport params JSON → standard base64 → URL-encode
            String paramsJson = objectMapper.writeValueAsString(Map.of(
                    "login",  login,
                    "term",   Map.of("h", rows, "w", cols),
                    "server_id", nodeId,
                    "sid",    teleportSessionId
            ));
            String b64     = Base64.getEncoder().encodeToString(paramsJson.getBytes(StandardCharsets.UTF_8));
            String encoded = URLEncoder.encode(b64, StandardCharsets.UTF_8);

            // https → wss, http → ws
            String wsBase = proxyUrl.replaceFirst("^https://", "wss://")
                                    .replaceFirst("^http://",  "ws://");
            return URI.create(wsBase + "/v1/webapi/sites/" + cluster + "/connect?params=" + encoded);
        } catch (Exception e) {
            throw new IllegalStateException("Teleport WebSocket URI 생성 실패", e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 내부 헬퍼
    // ──────────────────────────────────────────────────────────────────────────

    private synchronized String refreshToken() {
        // 이중 체크 (다른 스레드가 먼저 갱신했을 수 있음)
        if (cachedToken.get() != null && Instant.now().isBefore(tokenExpiry.get())) {
            return cachedToken.get();
        }
        try {
            String proxyUrl = requireProxyUrl();
            String user = configStore.get(ConfigCategory.IAM, "teleport.bot.user", "");
            String pass = configStore.get(ConfigCategory.IAM, "teleport.bot.pass", "");

            WebClient wc = buildWebClient(proxyUrl);
            String body = wc.post()
                    .uri("/v1/webapi/sessions/local")
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of("user", user, "pass", pass, "second_factor_token", ""))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root  = objectMapper.readTree(body);
            String token   = root.path("token").asText();
            if (token.isBlank()) throw new IllegalStateException("Teleport 로그인 응답에 token 없음: " + body);

            cachedToken.set(token);
            // 1시간 후 만료로 설정 (실제 세션 TTL에 관계없이 안전하게 갱신)
            tokenExpiry.set(Instant.now().plusSeconds(3600));
            log.info("Teleport 세션 토큰 갱신 완료");
            return token;
        } catch (Exception e) {
            throw new IllegalStateException("Teleport 로그인 실패", e);
        }
    }

    private String requireProxyUrl() {
        return configStore.get(ConfigCategory.IAM, "teleport.proxy.url")
                .orElseThrow(() -> new IllegalStateException("teleport.proxy.url 설정이 없습니다."));
    }

    private WebClient buildWebClient(String baseUrl) {
        boolean insecure = "true".equalsIgnoreCase(
                configStore.get(ConfigCategory.IAM, "teleport.insecure", "false"));

        WebClient.Builder builder = WebClient.builder().baseUrl(baseUrl);

        if (insecure) {
            // 개발환경용 TLS 검증 비활성화
            io.netty.handler.ssl.SslContext sslCtx;
            try {
                sslCtx = io.netty.handler.ssl.SslContextBuilder.forClient()
                        .trustManager(io.netty.handler.ssl.util.InsecureTrustManagerFactory.INSTANCE)
                        .build();
            } catch (Exception e) {
                throw new IllegalStateException("SSL 컨텍스트 생성 실패", e);
            }
            var httpClient = reactor.netty.http.client.HttpClient.create()
                    .secure(spec -> spec.sslContext(sslCtx));
            builder.clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(httpClient));
        }

        return builder.build();
    }
}
