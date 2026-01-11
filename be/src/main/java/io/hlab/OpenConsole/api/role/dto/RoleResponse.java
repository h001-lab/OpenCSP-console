package io.hlab.OpenConsole.api.role.dto;

import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import lombok.Getter;

import java.util.List;

/**
 * Role 조회 응답 DTO
 */
@Getter
public class RoleResponse {
    private String email;  // 사용자 이메일
    private List<IamRole> roles;

    private RoleResponse(String email, List<IamRole> roles) {
        this.email = email;
        this.roles = roles;
    }

    public static RoleResponse of(String email, List<IamRole> roles) {
        return new RoleResponse(email, roles);
    }
}

