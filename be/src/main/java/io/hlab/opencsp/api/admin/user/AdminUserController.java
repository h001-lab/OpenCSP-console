package io.hlab.opencsp.api.admin.user;

import io.hlab.opencsp.api.admin.user.dto.AdminUserResponse;
import io.hlab.opencsp.application.user.UserSyncService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.domain.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 어드민 전용 사용자 관리 API.
 * <p>
 * GET  /api/admin/users       — DB에 저장된 사용자 목록 조회
 * POST /api/admin/users/sync  — IAM → DB 동기화
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin User", description = "어드민 사용자 관리")
public class AdminUserController {

    private final UserRepository userRepository;
    private final UserSyncService userSyncService;

    @GetMapping
    @Operation(summary = "사용자 목록 조회 (DB)", description = "로컬 DB에 동기화된 사용자 목록을 반환한다.")
    public ApiResponse<List<AdminUserResponse>> listUsers() {
        List<AdminUserResponse> result = userRepository.findAll().stream()
                .map(AdminUserResponse::from)
                .toList();
        return ApiResponse.success(result);
    }

    @PostMapping("/sync")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "IAM 사용자 동기화", description = "IAM에서 사용자 목록과 역할을 가져와 로컬 DB에 upsert한다.")
    public ApiResponse<Map<String, Integer>> sync() {
        UserSyncService.SyncResult result = userSyncService.syncFromIam();
        return ApiResponse.success("동기화 완료", Map.of(
                "total",   result.total(),
                "created", result.created(),
                "updated", result.updated()
        ));
    }
}
