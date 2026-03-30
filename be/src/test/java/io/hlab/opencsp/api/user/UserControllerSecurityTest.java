package io.hlab.opencsp.api.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.domain.user.User;
import io.hlab.opencsp.domain.user.UserRepository;
import io.hlab.opencsp.infrastructure.iam.IamClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * UserController의 Security 테스트
 * JWT 토큰 기반 인증 및 Role 기반 권한 체크 테스트
 *
 * <p>Zitadel 관련 Executor는 모킹하여 실제 API 호출을 방지합니다.
 * 테스트 환경에서는 실제 Zitadel 서버가 없으므로 모킹이 필요합니다.
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

    @MockBean
    private IamClient iamClient;

    private Jwt jwtWithAdminRole;
    private Jwt jwtWithUserARole;

    @BeforeEach
    void setUp() {
        jwtWithAdminRole = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("sub", "test-user-id")
                .claim("email", "admin@test.com")
                .claim("roles", List.of("admin"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

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
    @DisplayName("인증되지 않은 사용자는 API에 접근할 수 없다")
    void getMyInfo_unauthenticatedUser_forbidden() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ADMIN role을 가진 사용자는 ADMIN 전용 API에 접근할 수 있다")
    void adminOnly_withAdminRole_success() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN role이 없는 사용자는 ADMIN 전용 API에 접근할 수 없다")
    void adminOnly_withoutAdminRole_forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(jwt().jwt(jwtWithUserARole)
                                .authorities(new SimpleGrantedAuthority("ROLE_USER_A"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("USER_A role을 가진 사용자는 USER_A 접근 가능 API에 접근할 수 있다")
    void userA_withUserARole_canAccessProvisions() throws Exception {
        mockMvc.perform(get("/api/provisions")
                        .with(jwt().jwt(jwtWithUserARole)
                                .authorities(new SimpleGrantedAuthority("ROLE_USER_A"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("인증된 사용자는 사용자 생성 API를 호출할 수 있다")
    void createUser_authenticatedUser_success() throws Exception {
        String requestBody = """
                {
                    "email": "newuser@test.com",
                    "name": "New User"
                }
                """;

        mockMvc.perform(post("/api/users")
                        .with(jwt().jwt(jwtWithUserARole))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }
}
