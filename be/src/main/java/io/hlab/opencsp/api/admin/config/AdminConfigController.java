package io.hlab.opencsp.api.admin.config;

import io.hlab.opencsp.api.admin.config.dto.ConfigEntryRequest;
import io.hlab.opencsp.api.admin.config.dto.ConfigEntryResponse;
import io.hlab.opencsp.application.config.ConfigService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.domain.config.AppConfig;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * 어드민 전용 통합 설정 관리 API.
 * <p>
 * 모든 엔드포인트는 ROLE_admin 권한이 필요하다.
 * sensitive=true 인 값은 응답에서 "****" 로 마스킹된다.
 * <p>
 * GET  /api/admin/configs                     전체 설정 (카테고리별 그룹)
 * GET  /api/admin/configs/{category}          카테고리별 설정 목록
 * PUT  /api/admin/configs                     설정 저장/수정
 * DELETE /api/admin/configs/{category}/{key} 설정 삭제 (env fallback 복귀)
 */
@RestController
@RequestMapping("/api/admin/configs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Config", description = "통합 설정 관리 (IAM/K8S/AI 등)")
public class AdminConfigController {

    private final ConfigService configService;

    @GetMapping
    @Operation(summary = "전체 설정 조회", description = "카테고리별로 그룹화된 전체 설정 목록을 반환한다.")
    public ApiResponse<Map<ConfigCategory, List<ConfigEntryResponse>>> getAll() {
        Map<ConfigCategory, List<ConfigEntryResponse>> result =
                configService.getAll().entrySet().stream()
                        .collect(Collectors.toMap(
                                Map.Entry::getKey,
                                e -> e.getValue().stream()
                                        .map(ConfigEntryResponse::from)
                                        .toList()
                        ));
        return ApiResponse.success(result);
    }

    @GetMapping("/{category}")
    @Operation(summary = "카테고리별 설정 조회")
    public ApiResponse<List<ConfigEntryResponse>> getByCategory(
            @PathVariable ConfigCategory category) {
        List<ConfigEntryResponse> list = configService.getByCategory(category).stream()
                .map(ConfigEntryResponse::from)
                .toList();
        return ApiResponse.success(list);
    }

    @PutMapping
    @Operation(summary = "설정 저장/수정",
            description = "category + key 조합으로 upsert. sensitive=true 이면 암호화 저장.")
    public ApiResponse<ConfigEntryResponse> save(
            @RequestBody @Valid ConfigEntryRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String updatedBy = jwt != null ? jwt.getSubject() : "anonymous";

        AppConfig saved = configService.save(
                request.getCategory(),
                request.getKey(),
                request.getValue(),
                request.isSensitive(),
                request.getDescription(),
                updatedBy
        );
        return ApiResponse.success("설정이 저장되었습니다.", ConfigEntryResponse.from(saved));
    }

    @DeleteMapping("/{category}/{key}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "설정 삭제", description = "DB 설정을 삭제하면 env/yaml 기본값으로 복귀한다.")
    public void delete(
            @PathVariable ConfigCategory category,
            @PathVariable String key) {
        configService.delete(category, key);
    }
}
