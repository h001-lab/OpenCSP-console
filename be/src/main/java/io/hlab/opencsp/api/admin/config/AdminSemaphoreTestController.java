package io.hlab.opencsp.api.admin.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

/**
 * Ansible Semaphore 연결 테스트 엔드포인트.
 * 저장하지 않고 제공된 값(또는 DB fallback)으로 연결을 검증한다.
 *
 * <p>테스트 단계:
 * <ol>
 *   <li>Ping — GET /api/ping → 2xx 응답 확인 (URL 도달 가능성)</li>
 *   <li>Auth — GET /api/user with Bearer token → 사용자 정보 표시</li>
 * </ol>
 *
 * <p>URL 정규화: 저장 형태가 "http://host" 또는 "http://host/api" 모두 허용.
 * 내부적으로 trailing "/api"를 제거하고 모든 경로에 "/api/..." 붙임.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/configs/semaphore")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminSemaphoreTestController {

    private final WebClient.Builder webClientBuilder;
    private final ConfigStore configStore;
    private final ObjectMapper objectMapper;

    public record TestRequest(String url, String apiToken) {}
    public record TestStep(String name, boolean success, String message) {}
    public record TestResult(boolean success, List<TestStep> steps) {}
    public record ProjectInfo(int id, String name) {}
    public record RepositoryInfo(int id, String name, String gitUrl) {}
    public record EnvironmentInfo(int id, String name) {}
    public record CreateRepoRequest(int projectId, String name, String gitUrl, String gitBranch, String accessToken) {}
    public record CreateVarGroupRequest(int projectId, String name, Map<String, String> variables) {}
    public record CreateResult(boolean success, String message, Integer id) {
        public CreateResult(boolean success, String message) { this(success, message, null); }
    }

    @PostMapping("/test")
    public ResponseEntity<TestResult> test(@RequestBody TestRequest req) {
        String raw = nonEmpty(req.url())
                ? req.url()
                : configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url", "");
        String token = nonEmpty(req.apiToken())
                ? req.apiToken()
                : configStore.get(ConfigCategory.SEMAPHORE, "semaphore.api.token", "");

        // URL 정규화: trailing slash, "/api" 제거 → 항상 "http://host" 형태로 유지
        String url = normalizeUrl(raw);

        if (url.isBlank()) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("URL", false, "Semaphore URL is required"))));
        }

        List<TestStep> steps = new ArrayList<>();
        WebClient wc = webClientBuilder.baseUrl(url).build();

        // Step 1: Ping — 2xx이면 통과 (응답 본문 무관)
        try {
            wc.get()
                    .uri("/api/ping")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            steps.add(new TestStep("Ping", true, url + "/api/ping reachable"));
        } catch (WebClientResponseException e) {
            steps.add(new TestStep("Ping", false,
                    "HTTP " + e.getStatusCode().value() + ": " + e.getStatusText()));
            return ResponseEntity.ok(new TestResult(false, steps));
        } catch (Exception e) {
            steps.add(new TestStep("Ping", false, "Connection failed: " + e.getMessage()));
            return ResponseEntity.ok(new TestResult(false, steps));
        }

        // Step 2: Auth — GET /api/user 로 사용자 정보 확인
        if (!token.isBlank()) {
            try {
                WebClient authWc = webClientBuilder.baseUrl(url)
                        .defaultHeader("Authorization", "Bearer " + token)
                        .build();
                String userBody = authWc.get()
                        .uri("/api/user")
                        .retrieve()
                        .bodyToMono(String.class)
                        .block(Duration.ofSeconds(8));
                String userInfo = extractUserInfo(userBody);
                steps.add(new TestStep("Auth", true, userInfo));
            } catch (WebClientResponseException e) {
                steps.add(new TestStep("Auth", false,
                        "HTTP " + e.getStatusCode().value() + " — token may be invalid"));
            } catch (Exception e) {
                steps.add(new TestStep("Auth", false, "Auth check failed: " + e.getMessage()));
            }
        }

        boolean allSuccess = steps.stream().allMatch(TestStep::success);
        return ResponseEntity.ok(new TestResult(allSuccess, steps));
    }

    // ─── 프로젝트 / 리소스 생성 ──────────────────────────────────────────────

    /** GET /projects — 저장된 크레덴셜로 Semaphore 프로젝트 목록 조회 */
    @GetMapping("/projects")
    public ResponseEntity<?> listProjects() {
        String url   = normalizeUrl(configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url", ""));
        String token = configStore.get(ConfigCategory.SEMAPHORE, "semaphore.api.token", "");
        if (url.isBlank() || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Semaphore URL/Token not configured"));
        }
        try {
            WebClient wc = webClientBuilder.baseUrl(url)
                    .defaultHeader("Authorization", "Bearer " + token)
                    .build();
            String body = wc.get().uri("/api/projects")
                    .retrieve().bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            JsonNode arr = objectMapper.readTree(body);
            List<ProjectInfo> projects = StreamSupport.stream(arr.spliterator(), false)
                    .map(n -> new ProjectInfo(n.path("id").asInt(), n.path("name").asText()))
                    .toList();
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    /** GET /repositories?projectId=N — Semaphore 프로젝트의 Git Repository 목록 조회 */
    @GetMapping("/repositories")
    public ResponseEntity<?> listRepositories(@org.springframework.web.bind.annotation.RequestParam int projectId) {
        String url   = normalizeUrl(configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url", ""));
        String token = configStore.get(ConfigCategory.SEMAPHORE, "semaphore.api.token", "");
        if (url.isBlank() || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Semaphore URL/Token not configured"));
        }
        try {
            WebClient wc = webClientBuilder.baseUrl(url)
                    .defaultHeader("Authorization", "Bearer " + token)
                    .build();
            String body = wc.get().uri("/api/project/{id}/repositories", projectId)
                    .retrieve().bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            JsonNode arr = objectMapper.readTree(body);
            List<RepositoryInfo> repos = StreamSupport.stream(arr.spliterator(), false)
                    .map(n -> new RepositoryInfo(
                            n.path("id").asInt(),
                            n.path("name").asText(),
                            n.path("git_url").asText()))
                    .toList();
            return ResponseEntity.ok(repos);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /repository — Semaphore 프로젝트에 Git Repository 생성.
     * accessToken 이 있으면 login_password 키를 먼저 생성하고 참조한다.
     */
    @PostMapping("/repository")
    public ResponseEntity<CreateResult> createRepository(@RequestBody CreateRepoRequest req) {
        String url   = normalizeUrl(configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url", ""));
        String token = configStore.get(ConfigCategory.SEMAPHORE, "semaphore.api.token", "");
        if (url.isBlank() || token.isBlank()) {
            return ResponseEntity.ok(new CreateResult(false, "Semaphore URL/Token not configured"));
        }
        WebClient wc = webClientBuilder.baseUrl(url)
                .defaultHeader("Authorization", "Bearer " + token)
                .build();
        try {
            // 1) SSH Key ID 결정: access token 있으면 login_password 키 생성, 없으면 None 키(id=0이 아닌 프로젝트 기본 None) 조회
            int keyId;
            if (req.accessToken() != null && !req.accessToken().isBlank()) {
                Map<String, Object> keyBody = new java.util.LinkedHashMap<>();
                keyBody.put("name", req.name() + "-token");
                keyBody.put("type", "login_password");
                keyBody.put("project_id", req.projectId());
                keyBody.put("login_password", Map.of("login", "git", "password", req.accessToken()));
                String keyJson = wc.post().uri("/api/project/" + req.projectId() + "/keys")
                        .bodyValue(Objects.requireNonNull(keyBody)).retrieve().bodyToMono(String.class)
                        .block(Duration.ofSeconds(8));
                keyId = objectMapper.readTree(keyJson).path("id").asInt();
            } else {
                // 프로젝트의 기존 키 중 type=none 인 것을 찾아 재사용
                String keysJson = wc.get().uri("/api/project/" + req.projectId() + "/keys")
                        .retrieve().bodyToMono(String.class)
                        .block(Duration.ofSeconds(8));
                JsonNode keys = objectMapper.readTree(keysJson);
                keyId = StreamSupport.stream(keys.spliterator(), false)
                        .filter(k -> "none".equals(k.path("type").asText()))
                        .mapToInt(k -> k.path("id").asInt())
                        .findFirst()
                        .orElse(0);
            }

            // 2) Repository 생성
            Map<String, Object> repoBody = new java.util.LinkedHashMap<>();
            repoBody.put("name", req.name());
            repoBody.put("project_id", req.projectId());
            repoBody.put("git_url", req.gitUrl());
            repoBody.put("git_branch", req.gitBranch() != null && !req.gitBranch().isBlank() ? req.gitBranch() : "main");
            repoBody.put("ssh_key_id", keyId);

            String repoJson = wc.post().uri("/api/project/" + req.projectId() + "/repositories")
                    .bodyValue(Objects.requireNonNull(repoBody)).retrieve().bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            int repoId = objectMapper.readTree(repoJson).path("id").asInt();

            // 생성된 repository ID를 ConfigStore에 자동 저장
            configStore.set(ConfigCategory.SEMAPHORE, "semaphore.repository.id", String.valueOf(repoId), false, null, "system");

            return ResponseEntity.ok(new CreateResult(true, "Repository '" + req.name() + "' created (id=" + repoId + ")", repoId));
        } catch (WebClientResponseException e) {
            return ResponseEntity.ok(new CreateResult(false, "HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            return ResponseEntity.ok(new CreateResult(false, e.getMessage()));
        }
    }

    /** GET /environments?projectId=N — Semaphore 프로젝트의 Variable Group(Environment) 목록 조회 */
    @GetMapping("/environments")
    public ResponseEntity<?> listEnvironments(@org.springframework.web.bind.annotation.RequestParam int projectId) {
        String url   = normalizeUrl(configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url", ""));
        String token = configStore.get(ConfigCategory.SEMAPHORE, "semaphore.api.token", "");
        if (url.isBlank() || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Semaphore URL/Token not configured"));
        }
        try {
            WebClient wc = webClientBuilder.baseUrl(url)
                    .defaultHeader("Authorization", "Bearer " + token)
                    .build();
            String body = wc.get().uri("/api/project/{id}/environment", projectId)
                    .retrieve().bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            JsonNode arr = objectMapper.readTree(body);
            List<EnvironmentInfo> envs = StreamSupport.stream(arr.spliterator(), false)
                    .map(n -> new EnvironmentInfo(n.path("id").asInt(), n.path("name").asText()))
                    .toList();
            return ResponseEntity.ok(envs);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        }
    }

    /** POST /variable-group — Semaphore 프로젝트에 Environment(Variable Group) 생성 */
    @PostMapping("/variable-group")
    public ResponseEntity<CreateResult> createVariableGroup(@RequestBody CreateVarGroupRequest req) {
        String url   = normalizeUrl(configStore.get(ConfigCategory.SEMAPHORE, "semaphore.url", ""));
        String token = configStore.get(ConfigCategory.SEMAPHORE, "semaphore.api.token", "");
        if (url.isBlank() || token.isBlank()) {
            return ResponseEntity.ok(new CreateResult(false, "Semaphore URL/Token not configured"));
        }
        try {
            WebClient wc = webClientBuilder.baseUrl(url)
                    .defaultHeader("Authorization", "Bearer " + token)
                    .build();
            // 동명 Environment가 이미 있으면 생성 생략하고 기존 ID 반환
            String existing = wc.get().uri("/api/project/" + req.projectId() + "/environment")
                    .retrieve().bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            java.util.Optional<JsonNode> existingNode = StreamSupport.stream(objectMapper.readTree(existing).spliterator(), false)
                    .filter(e -> req.name().equals(e.path("name").asText()))
                    .findFirst();
            if (existingNode.isPresent()) {
                int existingId = existingNode.get().path("id").asInt();
                configStore.set(ConfigCategory.SEMAPHORE, "semaphore.environment.id", String.valueOf(existingId), false, null, "system");
                return ResponseEntity.ok(new CreateResult(true, "Variable group '" + req.name() + "' already exists — skipped", existingId));
            }
            String jsonVars = objectMapper.writeValueAsString(req.variables());
            Map<String, Object> envBody = new java.util.LinkedHashMap<>();
            envBody.put("name", req.name());
            envBody.put("project_id", req.projectId());
            envBody.put("json", jsonVars);
            envBody.put("env", null);
            String created = wc.post().uri("/api/project/" + req.projectId() + "/environment")
                    .bodyValue(Objects.requireNonNull(envBody)).retrieve().bodyToMono(String.class)
                    .block(Duration.ofSeconds(8));
            int envId = objectMapper.readTree(created).path("id").asInt();
            configStore.set(ConfigCategory.SEMAPHORE, "semaphore.environment.id", String.valueOf(envId), false, null, "system");
            return ResponseEntity.ok(new CreateResult(true, "Variable group '" + req.name() + "' created (id=" + envId + ")", envId));
        } catch (WebClientResponseException e) {
            return ResponseEntity.ok(new CreateResult(false, "HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            return ResponseEntity.ok(new CreateResult(false, e.getMessage()));
        }
    }

    /** "http://host/api/" → "http://host", "http://host/" → "http://host" */
    private String normalizeUrl(String raw) {
        if (raw == null) return "";
        String u = raw.strip();
        // trailing slash 제거
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        // "/api" suffix 제거 (이미 포함된 경우 이중 경로 방지)
        if (u.endsWith("/api")) u = u.substring(0, u.length() - 4);
        return u;
    }

    /** 사용자 JSON에서 표시용 문자열 생성: "Admin (admin) <admin@example.com> [admin]" */
    private String extractUserInfo(String body) {
        try {
            Map<String, Object> json = objectMapper.readValue(body, new TypeReference<>() {});
            String name     = strVal(json, "name");
            String username = strVal(json, "username");
            String email    = strVal(json, "email");
            boolean isAdmin = Boolean.TRUE.equals(json.get("admin"));

            StringBuilder sb = new StringBuilder();
            if (!name.isBlank())     sb.append(name);
            if (!username.isBlank()) sb.append(" (").append(username).append(")");
            if (!email.isBlank())    sb.append(" <").append(email).append(">");
            if (isAdmin)             sb.append(" [admin]");
            return sb.isEmpty() ? "authenticated" : sb.toString().stripLeading();
        } catch (Exception ignored) {}
        return "authenticated";
    }

    private String strVal(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v instanceof String s ? s : "";
    }

    private boolean nonEmpty(String s) {
        return s != null && !s.isBlank();
    }
}
