package io.hlab.OpenConsole.api.role.dto;

import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;

import java.util.List;

/**
 * Role 부여 요청 DTO
 */
@Getter
public class RoleAssignRequest {
    @NotBlank(message = "사용자 이메일은 필수입니다.")
    @jakarta.validation.constraints.Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;  // 사용자 이메일

    @NotEmpty(message = "Role 목록은 필수입니다.")
    private List<IamRole> roles;
}

