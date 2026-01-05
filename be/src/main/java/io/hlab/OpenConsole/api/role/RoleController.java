package io.hlab.OpenConsole.api.role;

import io.hlab.OpenConsole.api.role.dto.RoleAssignRequest;
import io.hlab.OpenConsole.api.role.dto.RoleResponse;
import io.hlab.OpenConsole.application.role.RoleService;
import io.hlab.OpenConsole.common.dto.ApiResponse;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import io.hlab.OpenConsole.infrastructure.security.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Role 관리 API Controller
 * 관리자가 사용자의 role을 부여/제거/조회할 수 있는 API
 */
@Slf4j
@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;
    private final JwtUtils jwtUtils;

    /**
     * 사용자에게 role 부여
     * ADMIN 권한 필요
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> assignRole(
            @RequestBody @Valid RoleAssignRequest request,
            HttpServletRequest httpRequest) {
        try {
            roleService.assignRoles(request.getEmail(), request.getRoles());
            return ApiResponse.success("Role이 부여되었습니다.", null);
        } catch (IamException e) {
            log.error("Role 부여 실패: email={}, roles={}", request.getEmail(), request.getRoles(), e);
            return ApiResponse.error("ROLE_ASSIGN_FAILED", "Role 부여에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 사용자로부터 role 제거
     * ADMIN 권한 필요
     */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> removeRole(
            @RequestParam @jakarta.validation.constraints.Email String email,
            @RequestParam IamRole role) {
        try {
            roleService.removeRole(email, role);
            return ApiResponse.success("Role이 제거되었습니다.", null);
        } catch (IamException e) {
            log.error("Role 제거 실패: email={}, role={}", email, role, e);
            return ApiResponse.error("ROLE_REMOVE_FAILED", "Role 제거에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 사용자의 role 목록 조회
     * ADMIN 권한 필요
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<RoleResponse> getUserRoles(
            @RequestParam @jakarta.validation.constraints.Email String email,
            HttpServletRequest httpRequest) {
        try {
            List<IamRole> roles = roleService.getUserRoles(email);
            RoleResponse response = RoleResponse.of(email, roles);
            return ApiResponse.success(response);
        } catch (IamException e) {
            log.error("Role 조회 실패: email={}", email, e);
            return ApiResponse.error("ROLE_QUERY_FAILED", "Role 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 현재 로그인한 사용자의 role 목록 조회
     * 인증된 사용자 모두 접근 가능
     */
    @GetMapping("/me")
    public ApiResponse<RoleResponse> getMyRoles(HttpServletRequest httpRequest) {
        String email = jwtUtils.getCurrentUserEmail();
        if (email == null) {
            log.warn("Email을 가져올 수 없습니다. JWT에 email이 없고 Zitadel Management API 조회도 실패했습니다.");
            return ApiResponse.error("UNAUTHORIZED", "사용자 정보를 확인할 수 없습니다.");
        }

        List<IamRole> roles = roleService.getCurrentUserRoles();
        RoleResponse response = RoleResponse.of(email, roles);
        return ApiResponse.success(response);
    }
}

