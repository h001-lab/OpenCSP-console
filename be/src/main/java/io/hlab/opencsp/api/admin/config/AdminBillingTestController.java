package io.hlab.opencsp.api.admin.config;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 빌링 설정 연결 테스트 엔드포인트.
 * 저장하지 않고 제공된 설정값(또는 DB fallback)으로 연결을 검증한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/configs/billing")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminBillingTestController {

    private final WebClient.Builder webClientBuilder;
    private final ConfigStore configStore;

    public record TestRequest(String provider) {}

    public record TestStep(String name, boolean success, String message) {}

    public record TestResult(boolean success, List<TestStep> steps) {}

    @PostMapping("/test")
    public ResponseEntity<TestResult> test(@RequestBody TestRequest req) {
        String provider = req.provider() != null ? req.provider() : "none";

        if ("none".equals(provider)) {
            return ResponseEntity.ok(new TestResult(true, List.of(
                    new TestStep("Provider", true, "No billing provider configured — skipping test")
            )));
        }

        if ("lago".equals(provider)) {
            return ResponseEntity.ok(testLago(req));
        }

        return ResponseEntity.ok(new TestResult(false, List.of(
                new TestStep("Provider", false, "Unknown provider: " + provider)
        )));
    }

    private TestResult testLago(TestRequest req) {
        List<TestStep> steps = new ArrayList<>();

        String url = configStore.get(ConfigCategory.BILLING, "lago.url", "");
        String apiKey = configStore.get(ConfigCategory.BILLING, "lago.api-key", "");

        if (url.isBlank()) {
            return new TestResult(false, List.of(
                    new TestStep("URL", false, "Lago API URL is not configured in DB (BILLING / lago.url)")));
        }

        // Normalize: strip trailing slash and /api suffix so users can enter either
        // "https://lago.host" or "https://lago.host/api" and both work correctly.
        url = url.stripTrailing();
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        if (url.endsWith("/api")) url = url.substring(0, url.length() - 4);

        log.atDebug().addKeyValue("lago_url", url).log("Lago connection test started");

        // Disable auto-redirect so we capture 3xx directly instead of following to login HTML
        HttpClient httpClient = HttpClient.create().followRedirect(false);
        WebClient client = webClientBuilder
                .baseUrl(url)
                .defaultHeader("Content-Type", "application/json")
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();

        // Step 1: Reachability — any HTTP response (including 4xx) means the server is up
        record ResponsePair(HttpStatusCode status, String body) {}
        ResponsePair resp;
        try {
            resp = client.get()
                    .uri("/api/v1/organizations")
                    .header("Authorization", "Bearer " + apiKey)
                    .exchangeToMono(r -> r.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .map(b -> new ResponsePair(r.statusCode(), b)))
                    .block(Duration.ofSeconds(8));
        } catch (Exception e) {
            steps.add(new TestStep("API Reachability", false, "Connection failed: " + e.getMessage()));
            return new TestResult(false, steps);
        }

        if (resp == null) {
            steps.add(new TestStep("API Reachability", false, "No response from server"));
            return new TestResult(false, steps);
        }

        steps.add(new TestStep("API Reachability", true, "Connected — HTTP " + resp.status().value()));

        // Step 2: API Key validation — expect 200 with Lago JSON
        int status = resp.status().value();
        String body = resp.body();
        if (status == 401 || status == 403) {
            steps.add(new TestStep("API Key", false, "HTTP " + status + " — API key is invalid or missing"));
            return new TestResult(false, steps);
        }
        if (status == 301 || status == 302 || status == 307 || status == 308) {
            String location = resp.status().toString();
            steps.add(new TestStep("API Key", false,
                    "HTTP " + status + " redirect — the API endpoint is redirecting, likely to a login page. Check that lago.url points to the API server root (e.g. https://lago.avgmax.team), not a sub-path."));
            return new TestResult(false, steps);
        }
        if (status != 200) {
            steps.add(new TestStep("API Key", false, "HTTP " + status + ": " + body.substring(0, Math.min(200, body.length()))));
            return new TestResult(false, steps);
        }
        if (body.trim().startsWith("<")) {
            steps.add(new TestStep("API Key", false,
                    "Server returned HTML from " + url + "/api/v1/organizations — this URL is pointing to the Lago frontend (Next.js), not the Rails API backend. Check the lago.url config value."));
            return new TestResult(false, steps);
        }
        if (!body.contains("\"organization\"") && !body.contains("\"lago_id\"")) {
            steps.add(new TestStep("API Key", false,
                    "Unexpected response format: " + body.substring(0, Math.min(200, body.length()))));
            return new TestResult(false, steps);
        }
        steps.add(new TestStep("API Key", true, "API key accepted"));

        boolean allSuccess = steps.stream().allMatch(TestStep::success);
        return new TestResult(allSuccess, steps);
    }

}
