package io.hlab.opencsp.api.admin.provision;

import io.hlab.opencsp.application.provision.ProvisionSummary;
import io.hlab.opencsp.application.provision.ProvisioningService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 어드민 전용 프로비저닝 조회/관리 API.
 * <p>
 * GET  /api/admin/provisions       — 전체 유저의 프로비저닝 목록 반환
 * POST /api/admin/provisions/sync  — 클러스터 CR → DB 재동기화
 */
@RestController
@RequestMapping("/api/admin/provisions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Provisions", description = "어드민 프로비저닝 관리")
public class AdminProvisionController {

    private final ProvisioningService provisioningService;

    @GetMapping
    @Operation(summary = "전체 프로비저닝 목록 조회", description = "모든 유저의 프로비저닝 목록을 반환한다.")
    public ApiResponse<List<ProvisionSummary>> listAll() {
        return ApiResponse.success(provisioningService.listAll());
    }

    @PostMapping("/sync")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "클러스터 CR 동기화",
               description = "k8s 클러스터의 Terraform CR을 읽어 DB에 없는 항목을 임포트한다. DB 유실 복구용.")
    public ApiResponse<Map<String, Integer>> syncFromCluster() {
        ProvisioningService.SyncResult result = provisioningService.syncFromCluster();
        return ApiResponse.success("클러스터 동기화 완료", Map.of(
                "total",   result.total(),
                "created", result.created(),
                "skipped", result.skipped()
        ));
    }
}
