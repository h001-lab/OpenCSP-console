package io.hlab.OpenConsole.infrastructure.security;

import io.hlab.OpenConsole.application.user.UserService;
import io.hlab.OpenConsole.domain.user.User;
import io.hlab.OpenConsole.infrastructure.iam.IamClient;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;

/**
 * JIT (Just-In-Time) User Provisioning Handler
 * OAuth2 로그인 성공 시:
 * 1. DB에 사용자가 없으면 생성
 * 2. 첫 로그인 시 IAM에 기본 role 부여
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JITUserProvisioningHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    private final UserService userService;
    private final IamClient iamClient;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        // 1. ZITADEL로부터 받은 사용자 정보(OIDC) 꺼내기
        Object principal = authentication.getPrincipal();
        
        if (principal instanceof OidcUser oidcUser) {
            String subject = oidcUser.getSubject(); // ZITADEL의 고유 ID (IAM API 호출용)
            String email = oidcUser.getEmail();
            // String name = oidcUser.getFullName(); // Phase 3에서 사용 예정

            // 2. DB에 해당 유저가 있는지 확인 (email 기준)
            Optional<User> existingUser = userService.findUserByEmail(email);
            
            if (existingUser.isPresent()) {
                // 기존 사용자: 이름 업데이트만 (필요시)
                log.debug("User already exists: email={}", email);
            } else {
                // 3. 처음 로그인한 유저: DB에 새로 저장
                String userEmail = (email != null && !email.isBlank()) 
                    ? email 
                    : subject + "@zitadel.local"; // email이 없을 경우 (드물지만 방어적 처리)
                String userName = oidcUser.getFullName();
                if (userName == null || userName.isBlank()) {
                    userName = userEmail.substring(0, userEmail.indexOf("@"));
                }
                
                if (email == null || email.isBlank()) {
                    log.warn("OAuth2 user email is missing. Using subject-based email. subject={}, generatedEmail={}", subject, userEmail);
                }
                
                // DB에 사용자 생성
                User newUser = User.create(userEmail, userName);
                User savedUser = userService.createUser(newUser);
                log.info("New user created: id={}, email={}, subject={}", savedUser.getId(), userEmail, subject);
                
                // 4. 첫 로그인 시 IAM에 기본 role 부여
                // TODO: 기본 role은 설정으로 관리하거나 사용자 입력으로 받을 수 있음
                // 현재는 userA를 기본 role로 설정
                try {
                    iamClient.assignRole(subject, IamRole.USER_A);
                    log.info("Default role assigned to new user: subject={}, role=userA", subject);
                } catch (IamException e) {
                    log.error("Failed to assign default role to new user: subject={}", subject, e);
                    // role 부여 실패해도 로그인은 성공 처리 (나중에 수동으로 role 부여 가능)
                }
            }
        }

        // 5. 원래 가려던 페이지로 리다이렉트 (부모 클래스의 기본 동작)
        super.onAuthenticationSuccess(request, response, authentication);
    }
}
