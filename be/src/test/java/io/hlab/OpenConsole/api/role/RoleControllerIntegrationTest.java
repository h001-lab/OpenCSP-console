package io.hlab.OpenConsole.api.role;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.OpenConsole.api.role.dto.RoleAssignRequest;
import io.hlab.OpenConsole.application.role.RoleService;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
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

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * RoleController 통합 테스트
 * MockMvc를 사용하여 HTTP 요청/응답을 테스트
 * 
 * @SpringBootTest 사용 이유:
 * - 전체 애플리케이션 컨텍스트 로드로 Security 설정이 완전히 적용됨
 * - JWT 인증/인가 필터가 정상적으로 작동하여 통합 테스트에 적합
 */
@SpringBootTest
@AutoConfigureMockMvc  // Security 필터 자동 적용
@ActiveProfiles("test")
@DisplayName("RoleController 통합 테스트")
class RoleControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RoleService roleService;

    @MockBean
    private io.hlab.OpenConsole.infrastructure.security.JwtUtils jwtUtils;

    private static final String TEST_EMAIL = "test@example.com";
    private Jwt jwtWithAdminRole;

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
    }

    @Test
    @DisplayName("ADMIN 권한 사용자가 Role 부여 성공")
    void assignRole_withAdminRole_success() throws Exception {
        // Given
        RoleAssignRequest request = new RoleAssignRequest();
        request.setEmail(TEST_EMAIL);
        request.setRoles(List.of(IamRole.USER_A));

        doNothing().when(roleService).assignRoles(eq(TEST_EMAIL), any());

        // When & Then
        mockMvc.perform(post("/roles")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("Role이 부여되었습니다."))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(roleService, times(1)).assignRoles(eq(TEST_EMAIL), any());
    }

    @Test
    @DisplayName("ADMIN 권한 없는 사용자는 Role 부여 실패")
    void assignRole_withoutAdminRole_forbidden() throws Exception {
        // Given
        RoleAssignRequest request = new RoleAssignRequest();
        request.setEmail(TEST_EMAIL);
        request.setRoles(List.of(IamRole.USER_A));

        Jwt jwtWithoutAdmin = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .claim("sub", "test-user-id")
                .claim("email", "user@test.com")
                .claim("roles", List.of("userA"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        // When & Then
        mockMvc.perform(post("/roles")
                        .with(jwt().jwt(jwtWithoutAdmin)
                                .authorities(new SimpleGrantedAuthority("ROLE_USER_A")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(roleService, never()).assignRoles(any(), any());
    }

    @Test
    @DisplayName("인증되지 않은 사용자는 Role 부여 실패")
    void assignRole_unauthenticated_unauthorized() throws Exception {
        // Given
        RoleAssignRequest request = new RoleAssignRequest();
        request.setEmail(TEST_EMAIL);
        request.setRoles(List.of(IamRole.USER_A));

        // When & Then
        mockMvc.perform(post("/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(roleService, never()).assignRoles(any(), any());
    }

    @Test
    @DisplayName("잘못된 요청 형식 - Email 누락")
    void assignRole_invalidRequest_emailMissing_badRequest() throws Exception {
        // Given
        RoleAssignRequest request = new RoleAssignRequest();
        request.setRoles(List.of(IamRole.USER_A));
        // email 필드 누락

        // When & Then
        mockMvc.perform(post("/roles")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(roleService, never()).assignRoles(any(), any());
    }

    @Test
    @DisplayName("ADMIN 권한 사용자가 Role 제거 성공")
    void removeRole_withAdminRole_success() throws Exception {
        // Given
        doNothing().when(roleService).removeRole(eq(TEST_EMAIL), eq(IamRole.USER_A));

        // When & Then
        mockMvc.perform(delete("/roles")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .param("email", TEST_EMAIL)
                        .param("role", "USER_A"))
                .andExpect(status().isOk())  // ApiResponse를 반환하므로 200 OK
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("Role이 제거되었습니다."))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(roleService, times(1)).removeRole(eq(TEST_EMAIL), eq(IamRole.USER_A));
    }

    @Test
    @DisplayName("ADMIN 권한 사용자가 Role 조회 성공")
    void getUserRoles_withAdminRole_success() throws Exception {
        // Given
        List<IamRole> expectedRoles = List.of(IamRole.USER_A, IamRole.USER_B);
        when(roleService.getUserRoles(TEST_EMAIL)).thenReturn(expectedRoles);

        // When & Then
        mockMvc.perform(get("/roles")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .param("email", TEST_EMAIL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.email").value(TEST_EMAIL))
                .andExpect(jsonPath("$.data.roles[0]").value("USER_A"))
                .andExpect(jsonPath("$.data.roles[1]").value("USER_B"));

        verify(roleService, times(1)).getUserRoles(TEST_EMAIL);
    }

    @Test
    @DisplayName("IAM 에러 발생 시 적절한 에러 응답")
    void assignRole_iamException_errorResponse() throws Exception {
        // Given
        RoleAssignRequest request = new RoleAssignRequest();
        request.setEmail(TEST_EMAIL);
        request.setRoles(List.of(IamRole.USER_A));

        doThrow(new IamException("IAM 처리 중 오류가 발생했습니다."))
                .when(roleService).assignRoles(eq(TEST_EMAIL), any());

        // When & Then
        mockMvc.perform(post("/roles")
                        .with(jwt().jwt(jwtWithAdminRole)
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("IAM_ERROR"))
                .andExpect(jsonPath("$.message").value("IAM 처리 중 오류가 발생했습니다."));

        verify(roleService, times(1)).assignRoles(eq(TEST_EMAIL), any());
    }

    @Test
    @DisplayName("현재 사용자 Role 조회 - 인증된 사용자")
    void getMyRoles_authenticatedUser_success() throws Exception {
        // Given
        String currentEmail = "current@example.com";
        List<IamRole> expectedRoles = List.of(IamRole.USER_A);
        
        when(jwtUtils.getCurrentUserEmail()).thenReturn(currentEmail);
        when(roleService.getCurrentUserRoles()).thenReturn(expectedRoles);

        // When & Then
        mockMvc.perform(get("/roles/me")
                        .with(jwt().jwt(jwtWithAdminRole)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.email").value(currentEmail))
                .andExpect(jsonPath("$.data.roles[0]").value("USER_A"));

        verify(jwtUtils, times(1)).getCurrentUserEmail();
        verify(roleService, times(1)).getCurrentUserRoles();
    }

    @Test
    @DisplayName("현재 사용자 Role 조회 - Email을 가져올 수 없는 경우")
    void getMyRoles_emailNotFound_errorResponse() throws Exception {
        // Given
        when(jwtUtils.getCurrentUserEmail()).thenReturn(null);

        // When & Then
        mockMvc.perform(get("/roles/me")
                        .with(jwt().jwt(jwtWithAdminRole)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("사용자 정보를 확인할 수 없습니다."));

        verify(jwtUtils, times(1)).getCurrentUserEmail();
        verify(roleService, never()).getCurrentUserRoles();
    }
}
