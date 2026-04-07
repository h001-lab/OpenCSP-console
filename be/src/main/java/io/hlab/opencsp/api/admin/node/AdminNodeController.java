package io.hlab.opencsp.api.admin.node;

import io.hlab.opencsp.api.admin.node.dto.NodeRequest;
import io.hlab.opencsp.api.admin.node.dto.NodeResponse;
import io.hlab.opencsp.application.node.NodeService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.domain.node.Node;
import io.hlab.opencsp.domain.node.NodeStatus;
import io.hlab.opencsp.infrastructure.proxmox.ProxmoxNodePoller;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/nodes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Nodes", description = "노드 관리 API")
public class AdminNodeController {

    private final NodeService nodeService;
    private final ProxmoxNodePoller proxmoxNodePoller;

    // ─── 내부 타입 ────────────────────────────────────────────────────────────

    public record NodeCredentialsRequest(String proxmoxNode, String apiUrl, String apiToken) {}
    public record TestStep(String name, boolean success, String message) {}
    public record TestResult(boolean success, List<TestStep> steps) {}
    public record DiscoveredNode(String nodeName, String clusterStatus) {}
    public record ImportRequest(List<String> nodeNames) {}

    // ─── 기본 CRUD ────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "노드 목록 조회")
    public ApiResponse<List<NodeResponse>> list() {
        return ApiResponse.success(nodeService.findAll().stream().map(NodeResponse::from).toList());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "노드 등록")
    public ApiResponse<NodeResponse> create(@RequestBody @Valid NodeRequest request) {
        return ApiResponse.success(NodeResponse.from(
                nodeService.create(
                        request.getHostname(), request.getIp(),
                        request.getType(), request.getDescription(),
                        request.getProxmoxNode(), request.getApiUrl(), request.getApiToken())
        ));
    }

    @PatchMapping("/{uuid}/status")
    @Operation(summary = "노드 상태 변경")
    public ApiResponse<NodeResponse> updateStatus(
            @PathVariable String uuid,
            @RequestParam NodeStatus status) {
        return ApiResponse.success(NodeResponse.from(nodeService.updateStatus(uuid, status)));
    }

    @DeleteMapping("/{uuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "노드 삭제")
    public void delete(@PathVariable String uuid) {
        nodeService.delete(uuid);
    }

    // ─── API 크레덴셜 & 연결 테스트 ──────────────────────────────────────────

    @PutMapping("/{uuid}/credentials")
    @Operation(summary = "Proxmox API 크레덴셜 업데이트")
    public ApiResponse<NodeResponse> updateCredentials(
            @PathVariable String uuid,
            @RequestBody NodeCredentialsRequest request) {
        return ApiResponse.success(NodeResponse.from(
                nodeService.updateCredentials(uuid, request.proxmoxNode(), request.apiUrl(), request.apiToken())
        ));
    }

    @PostMapping("/{uuid}/test")
    @Operation(summary = "Proxmox API 연결 테스트")
    public ResponseEntity<TestResult> testConnection(
            @PathVariable String uuid,
            @RequestBody(required = false) NodeCredentialsRequest req) {

        Node node = nodeService.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + uuid));

        // 요청값 우선, 없으면 저장된 값 사용
        String apiUrl = nonBlank(req != null ? req.apiUrl() : null, node.getApiUrl());
        String apiToken = nonBlank(req != null ? req.apiToken() : null, node.getApiToken());
        String proxmoxNode = nonBlank(req != null ? req.proxmoxNode() : null, node.effectiveProxmoxNode());

        List<TestStep> steps = new ArrayList<>();

        if (apiUrl == null || apiUrl.isBlank()) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("Config", false, "API URL이 설정되지 않았습니다"))));
        }
        if (apiToken == null || apiToken.isBlank()) {
            return ResponseEntity.ok(new TestResult(false, List.of(
                    new TestStep("Config", false, "API Token이 설정되지 않았습니다"))));
        }

        try {
            ProxmoxNodePoller.ProxmoxMetrics m =
                    proxmoxNodePoller.fetchMetrics(apiUrl, apiToken, proxmoxNode);
            steps.add(new TestStep("Connect", true, apiUrl + " 연결 성공"));
            steps.add(new TestStep("Metrics", true, String.format(
                    "CPU: %.1f%% (%d cores), Mem: %s / %s",
                    m.cpuUsagePercent(), m.cpuTotal(),
                    humanBytes(m.memUsed()), humanBytes(m.memTotal()))));
            return ResponseEntity.ok(new TestResult(true, steps));
        } catch (Exception e) {
            steps.add(new TestStep("Connect", false, "연결 실패: " + e.getMessage()));
            return ResponseEntity.ok(new TestResult(false, steps));
        }
    }

    // ─── 자동 감지 ────────────────────────────────────────────────────────────

    @GetMapping("/discover")
    @Operation(summary = "Proxmox 클러스터 노드 자동 감지 (크레덴셜이 설정된 첫 번째 노드 기준)")
    public ResponseEntity<?> discoverClusterNodes() {
        List<Node> seeded = nodeService.findAllWithCredentials();
        if (seeded.isEmpty()) {
            return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                    .body(Map.of("error", "NO_SEED_NODE",
                                 "message", "크레덴셜이 설정된 활성 노드가 없습니다"));
        }
        Node seed = seeded.get(0);

        Set<String> existing = nodeService.findAll().stream()
                .flatMap(n -> Stream.of(n.getHostname(), n.getProxmoxNode()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        try {
            List<DiscoveredNode> discovered = proxmoxNodePoller.discoverNodes(seed.getApiUrl(), seed.getApiToken())
                    .stream()
                    .filter(n -> !existing.contains(n.node()))
                    .map(n -> new DiscoveredNode(n.node(), n.status()))
                    .toList();
            return ResponseEntity.ok(discovered);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "DISCOVER_FAILED", "message", e.getMessage()));
        }
    }

    @PostMapping("/discover/import")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "감지된 노드 일괄 등록 (seed 노드의 크레덴셜 재사용)")
    public ResponseEntity<?> importDiscoveredNodes(@RequestBody ImportRequest request) {
        List<Node> seeded = nodeService.findAllWithCredentials();
        if (seeded.isEmpty()) {
            return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED)
                    .body(Map.of("error", "NO_SEED_NODE"));
        }
        Node seed = seeded.get(0);

        String ip;
        try {
            ip = new URI(seed.getApiUrl()).getHost();
        } catch (Exception e) {
            ip = seed.getApiUrl();
        }

        String finalIp = ip;
        List<NodeResponse> created = request.nodeNames().stream()
                .map(name -> nodeService.create(
                        name, finalIp, seed.getType(), null,
                        name, seed.getApiUrl(), seed.getApiToken()))
                .map(NodeResponse::from)
                .toList();
        return ResponseEntity.ok(created);
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────────

    private String nonBlank(String preferred, String fallback) {
        return (preferred != null && !preferred.isBlank()) ? preferred : fallback;
    }

    private String humanBytes(long bytes) {
        if (bytes < 1024L * 1024) return bytes / 1024 + " KB";
        if (bytes < 1024L * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        return String.format("%.1f GB", bytes / (1024.0 * 1024 * 1024));
    }
}
