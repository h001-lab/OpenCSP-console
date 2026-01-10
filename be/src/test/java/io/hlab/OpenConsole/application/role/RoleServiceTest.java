package io.hlab.OpenConsole.application.role;

import io.hlab.OpenConsole.infrastructure.iam.IamClient;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import io.hlab.OpenConsole.infrastructure.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * RoleService 통합 테스트
 * IamClient를 Mock하여 RoleService의 비즈니스 로직을 테스트
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RoleService 통합 테스트")
class RoleServiceTest {

    @Mock
    private IamClient iamClient;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private RoleService roleService;

    private static final String TEST_EMAIL = "test@example.com";
    private static final String TEST_SUBJECT = "test-subject-id";

    @BeforeEach
    void setUp() {
        // 기본 설정: Email → Subject 변환
        when(iamClient.getUserSubjectByEmail(TEST_EMAIL)).thenReturn(TEST_SUBJECT);
    }

    @Test
    @DisplayName("단일 Role 부여 성공")
    void assignRole_singleRole_success() throws IamException {
        // Given
        IamRole role = IamRole.USER_A;

        // When
        roleService.assignRole(TEST_EMAIL, role);

        // Then
        verify(iamClient, times(1)).getUserSubjectByEmail(TEST_EMAIL);
        verify(iamClient, times(1)).assignRoles(eq(TEST_SUBJECT), eq(List.of(role)));
    }

    @Test
    @DisplayName("여러 Role 부여 성공")
    void assignRoles_multipleRoles_success() throws IamException {
        // Given
        List<IamRole> roles = List.of(IamRole.ADMIN, IamRole.USER_A, IamRole.USER_B);

        // When
        roleService.assignRoles(TEST_EMAIL, roles);

        // Then
        verify(iamClient, times(1)).getUserSubjectByEmail(TEST_EMAIL);
        verify(iamClient, times(1)).assignRoles(eq(TEST_SUBJECT), eq(roles));
    }

    @Test
    @DisplayName("Role 제거 성공")
    void removeRole_success() throws IamException {
        // Given
        IamRole role = IamRole.USER_A;

        // When
        roleService.removeRole(TEST_EMAIL, role);

        // Then
        verify(iamClient, times(1)).getUserSubjectByEmail(TEST_EMAIL);
        verify(iamClient, times(1)).removeRole(eq(TEST_SUBJECT), eq(role));
    }

    @Test
    @DisplayName("Role 조회 성공")
    void getUserRoles_success() throws IamException {
        // Given
        List<IamRole> expectedRoles = List.of(IamRole.ADMIN, IamRole.USER_A);
        when(iamClient.getUserRoles(TEST_SUBJECT)).thenReturn(expectedRoles);

        // When
        List<IamRole> actualRoles = roleService.getUserRoles(TEST_EMAIL);

        // Then
        assertThat(actualRoles).isEqualTo(expectedRoles);
        verify(iamClient, times(1)).getUserSubjectByEmail(TEST_EMAIL);
        verify(iamClient, times(1)).getUserRoles(TEST_SUBJECT);
    }

    @Test
    @DisplayName("사용자 존재하지 않을 때 Role 부여 실패")
    void assignRole_userNotFound_throwsException() throws IamException {
        // Given
        when(iamClient.getUserSubjectByEmail(TEST_EMAIL))
                .thenThrow(new IamException("사용자를 찾을 수 없습니다: email=" + TEST_EMAIL));

        // When & Then
        assertThatThrownBy(() -> roleService.assignRole(TEST_EMAIL, IamRole.USER_A))
                .isInstanceOf(IamException.class)
                .hasMessageContaining("사용자를 찾을 수 없습니다");

        verify(iamClient, times(1)).getUserSubjectByEmail(TEST_EMAIL);
        verify(iamClient, never()).assignRoles(any(), any());
    }

    @Test
    @DisplayName("IAM API 호출 실패 시 Role 부여 실패")
    void assignRole_iamApiFailure_throwsException() throws IamException {
        // Given
        doThrow(new IamException("Role 부여에 실패했습니다."))
                .when(iamClient).assignRoles(eq(TEST_SUBJECT), any());

        // When & Then
        assertThatThrownBy(() -> roleService.assignRoles(TEST_EMAIL, List.of(IamRole.USER_A)))
                .isInstanceOf(IamException.class)
                .hasMessageContaining("Role 부여에 실패했습니다");

        verify(iamClient, times(1)).getUserSubjectByEmail(TEST_EMAIL);
        verify(iamClient, times(1)).assignRoles(any(), any());
    }

    // Note: getCurrentUserRoles()는 SecurityContext에서 JWT를 읽는 구현이므로
    // 단위 테스트는 어렵고, 통합 테스트(RoleControllerIntegrationTest)에서 검증합니다.
    // 여기서는 단위 테스트를 제외하고 통합 테스트에서만 검증합니다.
}
