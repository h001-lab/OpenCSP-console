package io.hlab.opencsp.api.admin.config;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * IAM 설정 연결 테스트 엔드포인트.
 * 저장하지 않고 제공된 설정값(또는 DB fallback)으로 연결을 검증한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/configs/iam")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminIamTestController {

    private final WebClient.Builder webClientBuilder;
    private final ConfigStore configStore;
    private final ObjectMapper objectMapper;

    public record TestRequest(String provider, String issuerUri, String serviceToken) {}

    public record TestStep(String name, boolean success, String message) {}

    public record TestResult(boolean success, List<TestStep> steps) {}

    @PostMapping("/test")
    public ResponseEntity<TestResult> test(@RequestBody TestRequest req) {
        String provider = req.provider() != null ? req.provider() : "none";

        if ("none".equals(provider)) {
            return ResponseEntity.ok(new TestResult(true, List.of(
                    new TestStep("Provider", true, "No IAM provider configured — skipping test")
            )));
        }

        if ("zitadel".equals(provider)) {
            return ResponseEntity.ok(testZitadel(req));
        }

        return ResponseEntity.ok(new TestResult(false, List.of(
                new TestStep("Provider", false, "Unknown provider: " + provider)
        )));
    }

    private TestResult testZitadel(TestRequest req) {
        List<TestStep> steps = new ArrayList<>();

        // 요청값 우선, 없으면 DB fallback
        String issuerUri = nonEmpty(req.issuerUri())
                ? req.issuerUri()
                : configStore.get(ConfigCategory.IAM, "zitadel.issuer-uri", "");
        String serviceToken = nonEmpty(req.serviceToken())
                ? req.serviceToken()
                : configStore.get(ConfigCategory.IAM, "zitadel.service-token", "");

        if (issuerUri.isBlank()) {
            return new TestResult(false, List.of(
                    new TestStep("Issuer URI", false, "Issuer URI is required")));
        }

        String baseUrl;
        try {
            java.net.URI uri = java.net.URI.create(issuerUri);
            baseUrl = uri.getScheme() + "://" + uri.getAuthority();
        } catch (Exception e) {
            return new TestResult(false, List.of(
                    new TestStep("Issuer URI", false, "Invalid URI: " + issuerUri)));
        }

        // Step 1: OIDC discovery
        try {
            WebClient client = webClientBuilder.baseUrl(baseUrl).build();
            String body = client.get()
                    .uri("/.well-known/openid-configuration")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));

            if (body != null && body.contains("\"issuer\"")) {
                steps.add(new TestStep("OIDC Discovery", true, baseUrl + "/.well-known/openid-configuration reachable"));
            } else {
                steps.add(new TestStep("OIDC Discovery", false, "Invalid response from discovery endpoint"));
                return new TestResult(false, steps);
            }
        } catch (WebClientResponseException e) {
            steps.add(new TestStep("OIDC Discovery", false,
                    "HTTP " + e.getStatusCode().value() + ": " + e.getMessage()));
            return new TestResult(false, steps);
        } catch (Exception e) {
            steps.add(new TestStep("OIDC Discovery", false, "Connection failed: " + e.getMessage()));
            return new TestResult(false, steps);
        }

        // Step 2: Service token (있는 경우만)
        if (!serviceToken.isBlank()) {
            try {
                WebClient authClient = webClientBuilder.baseUrl(baseUrl)
                        .defaultHeader("Authorization", "Bearer " + serviceToken)
                        .defaultHeader("Content-Type", "application/json")
                        .defaultHeader("Connect-Protocol-Version", "1")
                        .build();

                String getUserBody = authClient.post()
                        .uri("/zitadel.user.v2.UserService/GetMyUser")
                        .bodyValue("{}")
                        .retrieve()
                        .bodyToMono(String.class)
                        .block(Duration.ofSeconds(8));

                String userId = extractUserId(getUserBody);
                steps.add(new TestStep("Service Token", true, "Token is valid (userId: " + userId + ")"));
            } catch (WebClientResponseException e) {
                steps.add(new TestStep("Service Token", false,
                        "HTTP " + e.getStatusCode().value() + " — token may be invalid or missing permissions"));
            } catch (Exception e) {
                steps.add(new TestStep("Service Token", false, "API call failed: " + e.getMessage()));
            }
        }

        boolean allSuccess = steps.stream().allMatch(TestStep::success);
        return new TestResult(allSuccess, steps);
    }

    private String extractUserId(String responseBody) {
        try {
            Map<String, Object> json = objectMapper.readValue(responseBody, new TypeReference<>() {});
            Object userObj = json.get("user");
            if (userObj instanceof Map<?, ?> user) {
                Object userId = user.get("userId");
                if (userId instanceof String s) return s;
            }
        } catch (Exception ignored) {}
        return "unknown";
    }

    private boolean nonEmpty(String s) {
        return s != null && !s.isBlank();
    }
}
