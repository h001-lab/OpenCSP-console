package io.hlab.OpenConsole.api.user;

import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Role 기반 권한 체크 예시
 * 실제 UserController에 적용할 수 있는 예시 코드
 */
@RestController
@RequestMapping("/users/example")
public class UserControllerExample {

    /**
     * ADMIN만 접근 가능
     */
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminOnly() {
        return "관리자 전용 API";
    }

    /**
     * ADMIN 또는 USER_A 접근 가능
     */
    @GetMapping("/admin-or-user-a")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER_A')")
    public String adminOrUserA() {
        return "관리자 또는 USER_A 접근 가능";
    }

    /**
     * 모든 인증된 사용자 접근 가능 (권한 체크 없음)
     */
    @GetMapping("/authenticated")
    public String authenticated() {
        return "인증된 사용자 접근 가능";
    }
}

