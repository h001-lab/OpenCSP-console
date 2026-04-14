package io.hlab.opencsp.infrastructure.billing.lago;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 앱 시작 시 Lago Billable Metric 3종을 멱등하게 생성한다.
 * billing.provider=lago 가 아니면 no-op.
 *
 * <p>메트릭 정의:
 * <ul>
 *   <li>{@code resource_provision_count} — COUNT, VM 프로비저닝 횟수
 *   <li>{@code resource_usage}           — SUM(duration_hours), VM 사용 시간
 *   <li>{@code console_session}          — SUM(duration_minutes), 콘솔 세션 시간
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BillingMetricSeeder implements ApplicationRunner {

    private static final List<LagoClient.BillableMetricDef> METRICS = List.of(
            new LagoClient.BillableMetricDef(
                    "Resource Provision Count",
                    "resource_provision_count",
                    "VM 프로비저닝 횟수. resource_type / user_id 기준 그룹 집계.",
                    "count_agg",
                    null
            ),
            new LagoClient.BillableMetricDef(
                    "Resource Usage",
                    "resource_usage",
                    "VM 사용 시간(시간 단위). 삭제 시점에 duration_hours를 SUM 집계.",
                    "sum_agg",
                    "duration_hours"
            ),
            new LagoClient.BillableMetricDef(
                    "Console Session",
                    "console_session",
                    "콘솔 세션 사용 시간(분 단위). 세션 종료 시점에 duration_minutes를 SUM 집계.",
                    "sum_agg",
                    "duration_minutes"
            )
    );

    private final LagoClient lagoClient;
    private final ConfigStore configStore;

    @Override
    public void run(ApplicationArguments args) {
        if (!"lago".equals(configStore.get(ConfigCategory.GENERAL, "billing.provider", "none"))) {
            return;
        }
        log.atInfo().log("Lago Billable Metric 시딩 시작");
        for (LagoClient.BillableMetricDef metric : METRICS) {
            lagoClient.ensureBillableMetric(metric);
        }
        log.atInfo().log("Lago Billable Metric 시딩 완료");
    }
}
