package io.hlab.opencsp.api.admin.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import io.hlab.opencsp.infrastructure.teleport.http.TeleportHttpClient;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Teleport (PAM) 연결 테스트 엔드포인트.
 * 저장하지 않고 제공된 값(또는 DB fallback)으로 연결을 검증한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/configs/pam")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminPamTestController {

    private final WebClient.Builder webClientBuilder;
    private final ConfigStore configStore;
    private final ObjectMapper objectMapper;
    private final TeleportHttpClient teleportHttpClient;

    public record TestRequest(
            String proxyUrl,
            String botUser,
            String botPass,
            String mfaToken,
            String insecure
    ) {}

    public record TestStep(String name, boolean success, String message) {}

    public record TestResult(boolean success, List<TestStep> steps) {}

    @PostMapping("/test")
    public ResponseEntity<TestResult> test(@RequestBody TestRequest req) {
        String proxyUrl = nonEmpty(req.proxyUrl())
                ? req.proxyUrl()
                : configStore.get(ConfigCategory.IAM, "teleport.proxy.url", "");
        String botUser = nonEmpty(req.botUser())
                ? req.botUser()
                : configStore.get(ConfigCategory.IAM, "teleport.bot.user", "");
        String botPass = nonEmpty(req.botPass()) && !"****".equals(req.botPass())
                ? req.botPass()
                : configStore.get(ConfigCategory.IAM, "teleport.bot.pass", "");
        String mfaToken = req.mfaToken() != null ? req.mfaToken().trim() : "";
        boolean insecure = "true".equalsIgnoreCase(
                nonEmpty(req.insecure()) ? req.insecure()
                        : configStore.get(ConfigCategory.IAM, "teleport.insecure", "false"));

        if (proxyUrl.isBlank()) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("Config", false, "Proxy URL is required"))));
        }

        List<TestStep> steps = new ArrayList<>();
        WebClient wc;
        try {
            wc = buildWebClient(proxyUrl, insecure);
        } catch (Exception e) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("SSL", false, "SSL context error: " + e.getMessage()))));
        }

        // Step 1: Proxy 연결 확인
        String clusterName;
        try {
            String body = wc.get()
                    .uri("/v1/webapi/ping")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            JsonNode root = objectMapper.readTree(body);
            clusterName = root.path("cluster_name").asText("unknown");
            steps.add(new TestStep("Proxy Reachable", true, proxyUrl + " — cluster: " + clusterName));
        } catch (WebClientResponseException e) {
            steps.add(new TestStep("Proxy Reachable", false,
                    "HTTP " + e.getStatusCode().value() + ": " + e.getMessage()));
            return ResponseEntity.ok(new TestResult(false, steps));
        } catch (Exception e) {
            steps.add(new TestStep("Proxy Reachable", false, "Connection failed: " + e.getMessage()));
            return ResponseEntity.ok(new TestResult(false, steps));
        }

        // Step 2: 로그인 (세션 토큰 발급)
        if (botUser.isBlank()) {
            steps.add(new TestStep("Login", false, "Bot user is required"));
            return ResponseEntity.ok(new TestResult(false, steps));
        }
        String sessionToken;
        String sessionCookie;
        try {
            org.springframework.http.ResponseEntity<String> loginResponse = wc.post()
                    .uri("/v1/webapi/sessions/web")
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of("user", botUser, "pass", botPass, "second_factor_token", mfaToken))
                    .retrieve()
                    .toEntity(String.class)
                    .block(Duration.ofSeconds(8));

            String body = loginResponse != null ? loginResponse.getBody() : "";
            JsonNode root = objectMapper.readTree(body);
            sessionToken = root.path("token").asText("");
            if (sessionToken.isBlank()) {
                steps.add(new TestStep("Login", false, "No token in response: " + body));
                return ResponseEntity.ok(new TestResult(false, steps));
            }

            // Set-Cookie 헤더에서 쿠키 추출
            java.util.List<String> setCookies = loginResponse.getHeaders()
                    .get(org.springframework.http.HttpHeaders.SET_COOKIE);
            sessionCookie = setCookies != null
                    ? setCookies.stream().map(c -> c.split(";")[0]).collect(java.util.stream.Collectors.joining("; "))
                    : "";

            steps.add(new TestStep("Login", true, "Authenticated as: " + botUser));
            teleportHttpClient.seedToken(sessionToken, sessionCookie, Instant.now().plusSeconds(3600));
        } catch (WebClientResponseException e) {
            String hint = e.getStatusCode().value() == 403 ? " (MFA required or wrong credentials)" : "";
            steps.add(new TestStep("Login", false,
                    "HTTP " + e.getStatusCode().value() + hint));
            return ResponseEntity.ok(new TestResult(false, steps));
        } catch (Exception e) {
            steps.add(new TestStep("Login", false, "Login failed: " + e.getMessage()));
            return ResponseEntity.ok(new TestResult(false, steps));
        }

        // Step 3: 노드 목록 조회 (권한 확인)
        try {
            String body = wc.get()
                    .uri(b -> b.path("/v1/webapi/sites/{cluster}/resources")
                            .queryParam("kinds", "node")
                            .queryParam("limit", "50")
                            .build(clusterName))
                    .header("Authorization", "Bearer " + sessionToken)
                    .header("Cookie", sessionCookie)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));

            JsonNode items = objectMapper.readTree(body).path("items");
            int count = items.isArray() ? items.size() : 0;
            steps.add(new TestStep("Nodes", true, count + " node(s) accessible"));
        } catch (WebClientResponseException e) {
            steps.add(new TestStep("Nodes", false,
                    "HTTP " + e.getStatusCode().value() + " — check role permissions"));
        } catch (Exception e) {
            steps.add(new TestStep("Nodes", false, "Node query failed: " + e.getMessage()));
        }

        boolean allSuccess = steps.stream().allMatch(TestStep::success);
        return ResponseEntity.ok(new TestResult(allSuccess, steps));
    }

    private WebClient buildWebClient(String baseUrl, boolean insecure) throws Exception {
        WebClient.Builder builder = webClientBuilder.clone().baseUrl(baseUrl);
        if (insecure) {
            SslContext sslCtx = SslContextBuilder.forClient()
                    .trustManager(InsecureTrustManagerFactory.INSTANCE)
                    .build();
            HttpClient httpClient = HttpClient.create()
                    .secure(spec -> spec.sslContext(sslCtx));
            builder.clientConnector(new ReactorClientHttpConnector(httpClient));
        }
        return builder.build();
    }

    private boolean nonEmpty(String s) {
        return s != null && !s.isBlank();
    }
}
