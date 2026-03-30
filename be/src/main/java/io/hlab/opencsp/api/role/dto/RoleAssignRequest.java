package io.hlab.opencsp.api.role.dto;

import io.hlab.opencsp.infrastructure.iam.IamRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RoleAssignRequest {

    @NotBlank(message = "사용자 이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;

    @NotEmpty(message = "Role 목록은 필수입니다.")
    private List<IamRole> roles;

    // Jackson은 @NoArgsConstructor + @Getter로 역직렬화 가능.
    // 아래 setter는 테스트 코드에서 직접 객체 생성 시 사용.
    public void setEmail(String email) { this.email = email; }
    public void setRoles(List<IamRole> roles) { this.roles = roles; }
}
