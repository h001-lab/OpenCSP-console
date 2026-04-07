package io.hlab.opencsp.api.admin.config;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
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

import javax.net.ssl.SSLException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * k3s / Kubernetes API 연결 테스트 엔드포인트.
 * 저장하지 않고 제공된 값(또는 DB fallback)으로 연결을 검증한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/configs/k8s")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminK8sTestController {

    private final WebClient.Builder webClientBuilder;
    private final ConfigStore configStore;

    public record TestRequest(String apiServer, String token) {}
    public record TestStep(String name, boolean success, String message) {}
    public record TestResult(boolean success, List<TestStep> steps) {}

    @PostMapping("/test")
    public ResponseEntity<TestResult> test(@RequestBody TestRequest req) {
        String apiServer = nonEmpty(req.apiServer())
                ? req.apiServer()
                : configStore.get(ConfigCategory.K8S, "api-server", "");
        String token = nonEmpty(req.token())
                ? req.token()
                : configStore.get(ConfigCategory.K8S, "token", "");

        if (apiServer.isBlank()) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("Config", false, "API Server URL is required"))));
        }
        if (token.isBlank()) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("Config", false, "Bearer token is required"))));
        }

        List<TestStep> steps = new ArrayList<>();

        try {
            WebClient wc = buildInsecureClient(apiServer, token);

            // Step 1: /version — 클러스터 버전 확인
            String version = wc.get()
                    .uri("/version")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));

            String versionSummary = extractVersion(version);
            steps.add(new TestStep("Connect", true, apiServer + " — " + versionSummary));

            // Step 2: /api/v1/namespaces — 네임스페이스 목록 조회 (권한 확인)
            String nsBody = wc.get()
                    .uri("/api/v1/namespaces")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));

            int nsCount = countItems(nsBody);
            steps.add(new TestStep("Auth", true, "Token valid — " + nsCount + " namespace(s) accessible"));

        } catch (WebClientResponseException e) {
            String stepName = steps.isEmpty() ? "Connect" : "Auth";
            steps.add(new TestStep(stepName, false,
                    "HTTP " + e.getStatusCode().value() + ": " + e.getStatusText()));
            return ResponseEntity.ok(new TestResult(false, steps));
        } catch (Exception e) {
            String stepName = steps.isEmpty() ? "Connect" : "Auth";
            steps.add(new TestStep(stepName, false, "Failed: " + e.getMessage()));
            return ResponseEntity.ok(new TestResult(false, steps));
        }

        return ResponseEntity.ok(new TestResult(true, steps));
    }

    private WebClient buildInsecureClient(String apiServer, String token) throws SSLException {
        SslContext sslContext = SslContextBuilder.forClient()
                .trustManager(InsecureTrustManagerFactory.INSTANCE)
                .build();
        HttpClient httpClient = HttpClient.create()
                .secure(spec -> spec.sslContext(sslContext));
        ReactorClientHttpConnector connector = new ReactorClientHttpConnector(
                java.util.Objects.requireNonNull(httpClient));
        return webClientBuilder
                .clone()
                .baseUrl(java.util.Objects.requireNonNull(apiServer))
                .defaultHeader("Authorization", "Bearer " + java.util.Objects.requireNonNull(token))
                .clientConnector(connector)
                .build();
    }

    private String extractVersion(String body) {
        if (body == null) return "unknown";
        try {
            // gitVersion 필드만 간단히 추출
            int idx = body.indexOf("\"gitVersion\"");
            if (idx < 0) return "connected";
            int start = body.indexOf("\"", idx + 13) + 1;
            int end = body.indexOf("\"", start);
            return body.substring(start, end);
        } catch (Exception e) {
            return "connected";
        }
    }

    private int countItems(String body) {
        if (body == null) return 0;
        int count = 0, idx = 0;
        while ((idx = body.indexOf("\"kind\":\"Namespace\"", idx)) >= 0) { count++; idx++; }
        return count;
    }

    private boolean nonEmpty(String s) {
        return s != null && !s.isBlank();
    }
}
