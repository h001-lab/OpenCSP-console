package io.hlab.OpenConsole.infrastructure.security;

import io.hlab.OpenConsole.application.user.UserService;
import io.hlab.OpenConsole.domain.user.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.hlab.OpenConsole.domain.user.IamProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

import java.io.IOException;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
@Slf4j
@Component
@RequiredArgsConstructor
public class JITUserProvisioningHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    private final UserService userService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        

        // 1. ZITADEL로부터 받은 사용자 정보(OIDC) 꺼내기
        Object principal = authentication.getPrincipal();
        
        if (principal instanceof OidcUser oidcUser) {
            String sub = oidcUser.getSubject(); // ZITADEL의 고유 ID (sub)
            String email = oidcUser.getEmail();
            String name = oidcUser.getFullName();

            // 2. DB에 해당 유저가 있는지 확인 (sub 기준)
            // 없으면 새로 생성(Provisioning), 있으면 기존 정보 업데이트
            userService.findUserBySubject(IamProvider.ZITADEL, sub)
                .map(existingUser -> {
                    // 필요하다면 여기서 이름이나 이메일 업데이트 로직 추가
                    log.debug("User already exists: sub={}, email={}", sub, existingUser.getEmail());
                    return existingUser;
                })
                .orElseGet(() -> {
                    // 처음 로그인한 유저라면 DB에 새로 저장
                    // email이 없을 경우 sub를 기반으로 기본값 생성 (DB 제약조건 대응)
                    String userEmail = (email != null && !email.isBlank()) 
                        ? email 
                        : sub + "@zitadel.local"; // sub 기반 기본 email
                    String userName = (name != null && !name.isBlank()) 
                        ? name 
                        : userEmail.substring(0, userEmail.indexOf("@"));
                    
                    if (email == null || email.isBlank()) {
                        log.warn("OAuth2 user email is missing. Using sub-based email. sub={}, generatedEmail={}", sub, userEmail);
                    }
                    
                    User newUser = User.create(userEmail, userName, IamProvider.ZITADEL, sub);
                    return userService.createUser(newUser);
                });
        }

        // 3. 원래 가려던 페이지로 리다이렉트 (부모 클래스의 기본 동작)
        super.onAuthenticationSuccess(request, response, authentication);

    }
}
