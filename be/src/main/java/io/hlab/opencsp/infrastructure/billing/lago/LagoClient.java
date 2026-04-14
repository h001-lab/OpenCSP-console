package io.hlab.opencsp.infrastructure.billing.lago;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Lago 빌링 API HTTP 클라이언트.
 * <p>
 * lago.url / lago.api-key가 DB에 설정된 경우에만 동작한다.
 * 미설정이거나 오류 발생 시 예외를 전파하지 않고 로그만 남긴다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LagoClient {

    private final WebClient.Builder webClientBuilder;
    private final ConfigStore configStore;

    public record LagoEvent(
            String transactionId,
            String externalCustomerId,
            String code,
            long timestamp,
            Map<String, Object> properties
    ) {}

    public record BillableMetricDef(
            String name,
            String code,
            String description,
            String aggregationType,  // count_agg | sum_agg
            String fieldName         // null for count_agg
    ) {}

    /**
     * Lago POST /api/v1/events 로 사용량 이벤트를 전송한다.
     * lago.url 또는 lago.api-key가 비어있으면 no-op.
     */
    public void sendEvent(LagoEvent event) {
        String url = configStore.get(ConfigCategory.BILLING, "lago.url", "").strip();
        String apiKey = configStore.get(ConfigCategory.BILLING, "lago.api-key", "").strip();

        if (url.isBlank() || apiKey.isBlank()) {
            log.atDebug().addKeyValue("code", event.code()).log("Lago 미설정, 이벤트 스킵");
            return;
        }

        // Normalize: strip trailing slash and /api suffix
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        if (url.endsWith("/api")) url = url.substring(0, url.length() - 4);

        Map<String, Object> body = Map.of("event", Map.of(
                "transaction_id", event.transactionId(),
                "external_customer_id", event.externalCustomerId(),
                "code", event.code(),
                "timestamp", event.timestamp(),
                "properties", event.properties()
        ));

        WebClient client = webClientBuilder
                .baseUrl(url)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .clientConnector(new ReactorClientHttpConnector(HttpClient.create()))
                .build();

        try {
            var statusCode = client.post()
                    .uri("/api/v1/events")
                    .bodyValue(body)
                    .exchangeToMono(r -> r.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .map(b -> r.statusCode()))
                    .block(Duration.ofSeconds(5));

            if (statusCode != null && statusCode.is2xxSuccessful()) {
                log.atDebug()
                        .addKeyValue("code", event.code())
                        .addKeyValue("external_customer_id", event.externalCustomerId())
                        .log("Lago 이벤트 전송 성공");
            } else {
                log.atWarn()
                        .addKeyValue("code", event.code())
                        .addKeyValue("http_status", statusCode != null ? statusCode.value() : "null")
                        .log("Lago 이벤트 전송 실패");
            }
        } catch (Exception e) {
            log.atWarn()
                    .addKeyValue("code", event.code())
                    .addKeyValue("error", e.getMessage())
                    .log("Lago 이벤트 전송 오류");
        }
    }

    /**
     * Lago에 Billable Metric을 생성한다. 이미 존재하면(422 value_already_exist) 스킵한다.
     * lago.url 또는 lago.api-key가 비어있으면 no-op.
     */
    public void ensureBillableMetric(BillableMetricDef def) {
        String url = configStore.get(ConfigCategory.BILLING, "lago.url", "").strip();
        String apiKey = configStore.get(ConfigCategory.BILLING, "lago.api-key", "").strip();

        if (url.isBlank() || apiKey.isBlank()) return;

        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        if (url.endsWith("/api")) url = url.substring(0, url.length() - 4);

        Map<String, Object> metricBody = new HashMap<>();
        metricBody.put("name", def.name());
        metricBody.put("code", def.code());
        metricBody.put("description", def.description());
        metricBody.put("aggregation_type", def.aggregationType());
        if (def.fieldName() != null) {
            metricBody.put("field_name", def.fieldName());
        }

        Map<String, Object> body = Map.of("billable_metric", metricBody);

        WebClient client = webClientBuilder
                .baseUrl(url)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .clientConnector(new ReactorClientHttpConnector(HttpClient.create()))
                .build();

        try {
            var response = client.post()
                    .uri("/api/v1/billable_metrics")
                    .bodyValue(body)
                    .exchangeToMono(r -> r.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .map(respBody -> Map.entry(r.statusCode(), respBody)))
                    .block(Duration.ofSeconds(10));

            if (response == null) return;

            int status = response.getKey().value();
            if (response.getKey().is2xxSuccessful()) {
                log.atInfo()
                        .addKeyValue("code", def.code())
                        .addKeyValue("aggregation_type", def.aggregationType())
                        .log("Lago Billable Metric 생성 완료");
            } else if (status == 422 && response.getValue().contains("value_already_exist")) {
                log.atDebug()
                        .addKeyValue("code", def.code())
                        .log("Lago Billable Metric 이미 존재, 스킵");
            } else {
                log.atWarn()
                        .addKeyValue("code", def.code())
                        .addKeyValue("http_status", status)
                        .addKeyValue("response", response.getValue())
                        .log("Lago Billable Metric 생성 실패");
            }
        } catch (Exception e) {
            log.atWarn()
                    .addKeyValue("code", def.code())
                    .addKeyValue("error", e.getMessage())
                    .log("Lago Billable Metric 생성 오류");
        }
    }
}
