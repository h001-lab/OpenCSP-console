package io.hlab.opencsp.application.billing;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.infrastructure.billing.lago.LagoClient;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 빌링 이벤트 발행 서비스.
 * <p>
 * billing.provider=lago 일 때만 동작하며, 그 외에는 모든 메서드가 no-op.
 * 오류가 발생해도 예외를 전파하지 않아 주 비즈니스 로직에 영향을 주지 않는다.
 *
 * <p>Lago Billable Metrics 권장 설정:
 * <ul>
 *   <li>{@code resource_provision_count} — COUNT, group by {@code resource_type} / {@code user_id}
 *   <li>{@code resource_usage}           — SUM of {@code duration_hours}, group by {@code resource_type} / {@code user_id}
 *   <li>{@code console_session}          — SUM of {@code duration_minutes}, group by {@code user_id}
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {

    private final LagoClient lagoClient;
    private final ConfigStore configStore;

    /** VM 프로비저닝 요청 시 호출 (PENDING 진입 시점). */
    public void recordVmProvisioned(String userId, String crName, String moduleType) {
        if (!isLagoEnabled()) return;
        Map<String, Object> props = new HashMap<>();
        props.put("user_id", userId);
        props.put("resource_type", moduleType);
        props.put("module_type", moduleType);
        props.put("cr_name", crName);

        lagoClient.sendEvent(new LagoClient.LagoEvent(
                UUID.randomUUID().toString(),
                userId,
                "resource_provision_count",
                Instant.now().getEpochSecond(),
                props
        ));
        log.atInfo()
                .addKeyValue("user_id", userId)
                // .addKeyValue("cr_name", crName)
                .addKeyValue("resource_type", moduleType)
                .log("빌링 이벤트: resource_provision_count");
    }

    /**
     * VM이 완전히 삭제(DESTROYED)된 시점에 호출.
     * provision.createdAt 기준으로 duration_hours를 계산하여 SUM 집계용으로 전송한다.
     */
    public void recordVmDestroyed(Provision provision) {
        if (!isLagoEnabled()) return;
        double durationHours = calcHours(provision.getCreatedAt());

        Map<String, Object> props = new HashMap<>();
        props.put("user_id", provision.getUserId());
        props.put("resource_type", provision.getModuleType());
        props.put("module_type", provision.getModuleType());
        props.put("cr_name", provision.getCrName());
        props.put("duration_hours", durationHours);

        lagoClient.sendEvent(new LagoClient.LagoEvent(
                "ru-" + provision.getCrName(),
                provision.getUserId(),
                "resource_usage",
                Instant.now().getEpochSecond(),
                props
        ));
        log.atInfo()
                .addKeyValue("user_id", provision.getUserId())
                // .addKeyValue("cr_name", provision.getCrName())
                .addKeyValue("duration_hours", durationHours)
                .log("빌링 이벤트: resource_usage");
    }

    /** 콘솔 세션이 ACTIVE 상태가 된 시점에 호출 (감사 목적). */
    public void recordConsoleSessionStarted(String userId, String sessionId, String crName) {
        if (!isLagoEnabled()) return;
        Map<String, Object> props = new HashMap<>();
        props.put("user_id", userId);
        props.put("cr_name", blankToEmpty(crName));
        props.put("session_id", sessionId);

        lagoClient.sendEvent(new LagoClient.LagoEvent(
                "cs-start-" + sessionId,
                userId,
                "console_session_start",
                Instant.now().getEpochSecond(),
                props
        ));
        log.atInfo()
                .addKeyValue("user_id", userId)
                .log("빌링 이벤트: console_session_start");
    }

    /**
     * 콘솔 세션이 종료(DISCONNECTED / FAILED)된 시점에 호출.
     * session.connectedAt 기준으로 duration_minutes를 계산하여 SUM 집계용으로 전송한다.
     */
    public void recordConsoleSessionEnded(ConsoleSession session) {
        if (!isLagoEnabled()) return;
        double durationMinutes = calcMinutes(session.getConnectedAt());

        Map<String, Object> props = new HashMap<>();
        props.put("user_id", session.getUserId());
        props.put("cr_name", blankToEmpty(session.getProvisionCrName()));
        props.put("session_id", session.getSessionId());
        props.put("duration_minutes", durationMinutes);

        lagoClient.sendEvent(new LagoClient.LagoEvent(
                "cs-end-" + session.getSessionId(),
                session.getUserId(),
                "console_session",
                Instant.now().getEpochSecond(),
                props
        ));
        log.atInfo()
                .addKeyValue("user_id", session.getUserId())
                .addKeyValue("duration_minutes", durationMinutes)
                .log("빌링 이벤트: console_session");
    }

    // -------------------------------------------------------------------------

    private boolean isLagoEnabled() {
        return "lago".equals(configStore.get(ConfigCategory.GENERAL, "billing.provider", "none"));
    }

    private double calcHours(LocalDateTime from) {
        if (from == null) return 0.0;
        long seconds = Duration.between(from.toInstant(ZoneOffset.UTC), Instant.now()).getSeconds();
        return Math.max(0.0, seconds / 3600.0);
    }

    private double calcMinutes(LocalDateTime from) {
        if (from == null) return 0.0;
        long seconds = Duration.between(from.toInstant(ZoneOffset.UTC), Instant.now()).getSeconds();
        return Math.max(0.0, seconds / 60.0);
    }

    private String blankToEmpty(String value) {
        return (value != null) ? value : "";
    }
}
