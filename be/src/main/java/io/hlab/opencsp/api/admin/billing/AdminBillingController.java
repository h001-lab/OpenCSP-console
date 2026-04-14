package io.hlab.opencsp.api.admin.billing;

import io.hlab.opencsp.domain.console.ConsoleSession;
import io.hlab.opencsp.domain.console.ConsoleSessionRepository;
import io.hlab.opencsp.domain.console.ConsoleSessionStatus;
import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionRepository;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import io.hlab.opencsp.infrastructure.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/**
 * 빌링 집계 요약 엔드포인트.
 * 로그인한 유저 본인의 프로비전/콘솔 세션 데이터만 집계하여 반환한다.
 */
@RestController
@RequestMapping("/api/billing")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class AdminBillingController {

    private final ProvisionRepository provisionRepository;
    private final ConsoleSessionRepository consoleSessionRepository;
    private final JwtUtils jwtUtils;

    public record BillingSummary(
            long totalProvisions,
            long activeProvisions,
            long totalConsoleSessions,
            long totalConsoleMinutes
    ) {}

    @GetMapping("/summary")
    public ResponseEntity<BillingSummary> summary() {
        String userId = jwtUtils.getCurrentUserSubject();

        List<Provision> provisions = userId != null
                ? provisionRepository.findByUserId(userId)
                : List.of();
        long totalProvisions = provisions.stream()
                .filter(p -> p.getStatus() != ProvisionStatus.DESTROYED)
                .count();
        long activeProvisions = provisions.stream()
                .filter(p -> p.getStatus() == ProvisionStatus.READY)
                .count();

        List<ConsoleSession> sessions = userId != null
                ? consoleSessionRepository.findByUserId(userId)
                : List.of();
        long totalConsoleSessions = sessions.size();
        long totalConsoleMinutes = sessions.stream()
                .filter(s -> s.getStatus() == ConsoleSessionStatus.DISCONNECTED
                        && s.getConnectedAt() != null
                        && s.getDisconnectedAt() != null)
                .mapToLong(s -> Duration.between(s.getConnectedAt(), s.getDisconnectedAt()).toMinutes())
                .sum();

        return ResponseEntity.ok(new BillingSummary(
                totalProvisions, activeProvisions, totalConsoleSessions, totalConsoleMinutes));
    }
}
