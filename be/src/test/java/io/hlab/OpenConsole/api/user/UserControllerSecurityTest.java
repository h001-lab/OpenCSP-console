package io.hlab.OpenConsole.api.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.OpenConsole.api.user.dto.UserCreateRequest;
import io.hlab.OpenConsole.domain.user.User;
import io.hlab.OpenConsole.domain.user.UserRepository;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * UserController의 Security 테스트
 * JWT 토큰 기반 인증 및 Role 기반 권한 체크 테스트
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private Jwt jwtWithAdminRole;
    private Jwt jwtWithUserARole;

    @BeforeEach
    void setUp() {
        // ADMIN role을 가진 JWT 토큰 생성
        jwtWithAdminRole = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("sub", "test-user-id")
                .claim("email", "admin@test.com")
                .claim("roles", List.of("admin"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        // USER_A role을 가진 JWT 토큰 생성
        jwtWithUserARole = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("sub", "test-user-id")
                .claim("email", "usera@test.com")
                .claim("roles", List.of("userA"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    @Test
    @Disabled("실제 OAuth2 로그인 플로우가 필요하므로 테스트 환경에서는 동작하지 않음. Swagger UI나 Postman으로 실제 환경에서 테스트하세요.")
    @DisplayName("인증된 사용자는 자신의 정보를 조회할 수 있다")
    void getMyInfo_authenticatedUser_success() throws Exception {
        // Given: DB에 사용자 생성 (JWT의 email과 일치해야 함)
        User user = User.create("usera@test.com", "Test User");
        userRepository.save(user);

        // When & Then: JWT 토큰과 함께 요청
        // 주의: getMyInfo는 OidcUser를 사용하므로 JWT 토큰만으로는 동작하지 않을 수 있음
        // 실제로는 OAuth2 로그인 플로우를 거쳐야 함
        mockMvc.perform(get("/users/api/me")
                        .with(jwt().jwt(jwtWithUserARole)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }

    @Test
    @DisplayName("인증되지 않은 사용자는 API에 접근할 수 없다")
    void getMyInfo_unauthenticatedUser_forbidden() throws Exception {
        mockMvc.perform(get("/users/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ADMIN role을 가진 사용자는 ADMIN 전용 API에 접근할 수 있다")
    void adminOnly_withAdminRole_success() throws Exception {
        mockMvc.perform(get("/users/example/admin-only")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN role이 없는 사용자는 ADMIN 전용 API에 접근할 수 없다")
    void adminOnly_withoutAdminRole_forbidden() throws Exception {
        mockMvc.perform(get("/users/example/admin-only")
                        .with(jwt().jwt(jwtWithUserARole)
                                .authorities(new SimpleGrantedAuthority("ROLE_USER_A"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("USER_A role을 가진 사용자는 USER_A 접근 가능 API에 접근할 수 있다")
    void adminOrUserA_withUserARole_success() throws Exception {
        mockMvc.perform(get("/users/example/admin-or-user-a")
                        .with(jwt().jwt(jwtWithUserARole)
                                .authorities(new SimpleGrantedAuthority("ROLE_USER_A"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("인증된 사용자는 사용자 생성 API를 호출할 수 있다")
    void createUser_authenticatedUser_success() throws Exception {
        // UserCreateRequest는 생성자나 빌더 패턴을 사용할 수 있음
        // 실제 구조에 맞게 수정 필요
        String requestBody = """
            {
                "email": "newuser@test.com",
                "name": "New User"
            }
            """;

        mockMvc.perform(post("/users")
                        .with(jwt().jwt(jwtWithUserARole))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }
}

