package io.hlab.opencsp.infrastructure.proxmox;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.application.node.NodeService;
import io.hlab.opencsp.domain.node.Node;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

/**
 * Proxmox 노드 메트릭을 주기적으로 폴링하여 DB에 업데이트한다.
 * API 크레덴셜이 설정된 노드만 대상으로 한다.
 *
 * <p>Proxmox API 인증: Authorization: PVEAPIToken=USER@REALM!TOKENID=UUID
 * <p>메트릭 엔드포인트: GET /api2/json/nodes/{node}/status
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProxmoxNodePoller {

    private final NodeService nodeService;
    private final ObjectMapper objectMapper;

    /** 앱 시작 1분 후 첫 실행, 이후 5분마다 반복. */
    @Scheduled(initialDelay = 60_000, fixedDelay = 300_000)
    public void pollAll() {
        List<Node> nodes = nodeService.findAllWithCredentials();
        if (nodes.isEmpty()) return;
        log.debug("Proxmox 메트릭 폴링 시작: {}개 노드", nodes.size());
        for (Node node : nodes) {
            try {
                pollNode(node);
            } catch (Exception e) {
                log.warn("Proxmox 메트릭 폴링 실패: node={}, error={}",
                        node.getHostname(), e.getMessage());
            }
        }
    }

    /**
     * 단일 노드의 메트릭을 Proxmox API로 조회하여 반환한다.
     * 연결 테스트 엔드포인트에서도 사용된다.
     */
    public ProxmoxMetrics fetchMetrics(String apiUrl, String apiToken, String proxmoxNode)
            throws Exception {
        WebClient wc = buildInsecureWebClient(apiUrl);
        String body = wc.get()
                .uri("/api2/json/nodes/{node}/status", proxmoxNode)
                .header("Authorization", "PVEAPIToken=" + apiToken)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(10))
                .block();

        JsonNode data = objectMapper.readTree(body).path("data");
        double cpu     = data.path("cpu").asDouble(0);
        int maxCpu     = data.path("maxcpu").asInt(1);
        long mem       = data.path("mem").asLong(0);
        long maxMem    = data.path("maxmem").asLong(0);
        long disk      = data.path("disk").asLong(0);
        long maxDisk   = data.path("maxdisk").asLong(0);

        return new ProxmoxMetrics(cpu * 100.0, maxCpu, mem, maxMem, disk, maxDisk);
    }

    private void pollNode(Node node) throws Exception {
        ProxmoxMetrics m = fetchMetrics(
                node.getApiUrl(), node.getApiToken(), node.effectiveProxmoxNode());
        nodeService.updateMetrics(
                node.getUuid(),
                m.cpuUsagePercent(), m.cpuTotal(),
                m.memUsed(), m.memTotal(),
                m.diskUsed(), m.diskTotal());
        log.debug("메트릭 업데이트: node={}, cpu={}%, mem={}/{} bytes",
                node.getHostname(),
                String.format("%.1f", m.cpuUsagePercent()),
                m.memUsed(), m.memTotal());
    }

    /** Proxmox는 기본적으로 자체 서명 인증서를 사용하므로 TLS 검증 비활성화. */
    private WebClient buildInsecureWebClient(String baseUrl) {
        try {
            var sslCtx = SslContextBuilder.forClient()
                    .trustManager(InsecureTrustManagerFactory.INSTANCE)
                    .build();
            var httpClient = HttpClient.create()
                    .secure(spec -> spec.sslContext(sslCtx));
            return WebClient.builder()
                    .baseUrl(baseUrl)
                    .clientConnector(new ReactorClientHttpConnector(httpClient))
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("SSL 컨텍스트 생성 실패", e);
        }
    }

    /** Proxmox 클러스터의 전체 노드 목록을 조회한다 (GET /api2/json/nodes). */
    public List<DiscoveredNodeInfo> discoverNodes(String apiUrl, String apiToken) throws Exception {
        WebClient wc = buildInsecureWebClient(apiUrl);
        String body = wc.get()
                .uri("/api2/json/nodes")
                .header("Authorization", "PVEAPIToken=" + apiToken)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(10))
                .block();

        JsonNode data = objectMapper.readTree(body).path("data");
        List<DiscoveredNodeInfo> result = new ArrayList<>();
        for (JsonNode n : data) {
            result.add(new DiscoveredNodeInfo(
                    n.path("node").asText(),
                    n.path("status").asText("unknown")
            ));
        }
        return result;
    }

    public record ProxmoxMetrics(
            double cpuUsagePercent,
            int cpuTotal,
            long memUsed,
            long memTotal,
            long diskUsed,
            long diskTotal
    ) {}

    public record DiscoveredNodeInfo(String node, String status) {}
}
