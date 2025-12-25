package io.hlab.OpenConsole.api.user.dto;

import io.hlab.OpenConsole.domain.user.IamProvider;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;

@Getter
public class UserCreateRequest {
    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @Size(max = 100, message = "이메일은 100자 이하여야 합니다.")
    private String email;

    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 50, message = "이름은 50자 이하여야 합니다.")
    private String name;

    @NotBlank(message = "IAM 공급자는 필수입니다.")
    @Enumerated(EnumType.STRING)
    private IamProvider provider;

    @NotBlank(message = "IAM 고유 식별자는 필수입니다.")
    @Size(max = 100, message = "IAM 고유 식별자는 100자 이하여야 합니다.")
    private String subject;
}

