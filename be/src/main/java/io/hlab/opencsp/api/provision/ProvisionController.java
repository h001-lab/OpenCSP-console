package io.hlab.opencsp.api.provision;

import io.hlab.opencsp.api.provision.dto.ProvisionHistoryResponse;
import io.hlab.opencsp.api.provision.dto.ProvisionRequest;
import io.hlab.opencsp.api.provision.dto.ProvisionResponse;
import io.hlab.opencsp.application.provision.ProvisionSummary;
import io.hlab.opencsp.application.provision.ProvisioningService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.common.web.RequestUtils;
import io.hlab.opencsp.domain.provision.ProvisionHistoryRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * 인프라 프로비저닝 API.
 * <p>
 * FluxCD + tofu-controller를 통해 Terraform 모듈을 실행한다.
 * k3s의 GitRepository CR을 참조하므로 사전에 해당 CR이 존재해야 한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/provisions")
@RequiredArgsConstructor
@Tag(name = "Provisioning", description = "Terraform 기반 인프라 프로비저닝 API")
public class ProvisionController {

    private final ProvisioningService provisioningService;
    private final ProvisionHistoryRepository provisionHistoryRepository;

    @GetMapping
    @Operation(summary = "내 프로비저닝 목록 조회", description = "현재 유저의 DB 기록과 k8s 실시간 상태를 합쳐 반환한다.")
    public ApiResponse<List<ProvisionSummary>> listMine(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest httpRequest) {
        String userId = resolveUserId(jwt, httpRequest);
        return ApiResponse.success(provisioningService.listByUserId(userId));
    }

    @GetMapping("/history")
    @Operation(summary = "프로비저닝 이력 조회", description = "현재 유저의 provision_histories 테이블 이력을 최신순으로 반환한다.")
    public ApiResponse<List<ProvisionHistoryResponse>> listHistory(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest httpRequest) {
        String userId = resolveUserId(jwt, httpRequest);
        List<ProvisionHistoryResponse> result = provisionHistoryRepository.findByUserId(userId)
                .stream().map(ProvisionHistoryResponse::from).toList();
        return ApiResponse.success(result);
    }

    @GetMapping("/next-vm-id")
    @Operation(summary = "다음 VM ID 조회", description = "기존 VM ID와 겹치지 않는 다음 사용 가능한 ID를 반환한다.")
    public ApiResponse<Long> nextVmId() {
        return ApiResponse.success(provisioningService.nextVmId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "프로비저닝 시작", description = "Terraform CR을 생성하여 인프라 프로비저닝을 시작한다.")
    public ApiResponse<ProvisionResponse> provision(
            @RequestBody @Valid ProvisionRequest request,
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest httpRequest) {

        String userId = resolveUserId(jwt, httpRequest);
        String crName = provisioningService.provision(
                userId,
                request.getModuleType(),
                request.getGitRepositoryName(),
                request.getCrName(),
                request.getVars()
        );

        ProvisionResponse response = new ProvisionResponse(
                crName,
                request.getModuleType(),
                userId,
                buildStatusUrl(httpRequest, crName)
        );

        return ApiResponse.success("프로비저닝이 시작되었습니다.", response);
    }

    @GetMapping("/{crName}/status")
    @Operation(summary = "프로비저닝 상태 조회", description = "Terraform CR의 현재 상태를 반환한다.")
    public ApiResponse<Map<String, Object>> getStatus(@PathVariable String crName) {
        Map<String, Object> status = provisioningService.getStatus(crName);
        return ApiResponse.success(status);
    }

    @DeleteMapping("/{crName}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "프로비저닝 삭제", description = "Terraform CR을 삭제하여 인프라를 제거한다.")
    public void destroy(@PathVariable String crName) {
        provisioningService.destroy(crName);
    }

    // -------------------------------------------------------------------------

    private String resolveUserId(Jwt jwt, HttpServletRequest request) {
        if (jwt != null) {
            String sub = jwt.getSubject();
            return sub != null ? sub : "anonymous";
        }
        // IAM none-mode: FE 라우트 핸들러가 세션의 user.id를 X-User-Id 헤더로 전달
        String xUserId = request.getHeader("X-User-Id");
        if (xUserId != null && !xUserId.isBlank()) return xUserId;
        // Fallback: JWT 서명 검증 없이 Bearer 토큰에서 sub 추출
        return RequestUtils.extractJwtSubject(request).orElse("anonymous");
    }

    private String buildStatusUrl(HttpServletRequest req, String crName) {
        String base = req.getScheme() + "://" + req.getServerName();
        int port = req.getServerPort();
        if (port != 80 && port != 443) base += ":" + port;
        return base + "/api/provisions/" + crName + "/status";
    }
}
