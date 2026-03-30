package io.hlab.opencsp.api.role;

import io.hlab.opencsp.api.role.dto.RoleAssignRequest;
import io.hlab.opencsp.api.role.dto.RoleResponse;
import io.hlab.opencsp.application.role.RoleService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.infrastructure.iam.IamRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Role 관리 API Controller
 * 관리자가 사용자의 role을 부여/제거/조회할 수 있는 API
 */
@Slf4j
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    /**
     * 사용자에게 role 부여
     * admin 권한 필요
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> assignRole(@RequestBody @Valid RoleAssignRequest request) {
        roleService.assignRoles(request.getEmail(), request.getRoles());
        return ApiResponse.success("Role이 부여되었습니다.", null);
    }

    /**
     * 사용자로부터 role 제거
     * admin 권한 필요
     * DELETE /api/roles/{email}/{role}
     */
    @DeleteMapping("/{email}/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> removeRole(
            @PathVariable @jakarta.validation.constraints.Email String email,
            @PathVariable IamRole role) {
        roleService.removeRole(email, role);
        return ApiResponse.success("Role이 제거되었습니다.", null);
    }

    /**
     * 사용자의 role 목록 조회
     * admin 권한 필요
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<RoleResponse> getUserRoles(
            @RequestParam @jakarta.validation.constraints.Email String email) {
        List<IamRole> roles = roleService.getUserRoles(email);
        return ApiResponse.success(RoleResponse.of(email, roles));
    }

    /**
     * 현재 로그인한 사용자의 role 목록 조회
     * 인증된 사용자 모두 접근 가능
     */
    @GetMapping("/me")
    public ApiResponse<RoleResponse> getMyRoles(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            return ApiResponse.error("UNAUTHORIZED", "사용자 정보를 확인할 수 없습니다.");
        }
        Jwt jwt = (Jwt) jwtAuth.getPrincipal();
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            return ApiResponse.error("UNAUTHORIZED", "사용자 정보를 확인할 수 없습니다.");
        }
        List<IamRole> roles = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .flatMap(name -> {
                    try { return java.util.stream.Stream.of(IamRole.valueOf(name)); }
                    catch (IllegalArgumentException e) { return java.util.stream.Stream.empty(); }
                })
                .toList();
        return ApiResponse.success(RoleResponse.of(email, roles));
    }
}
