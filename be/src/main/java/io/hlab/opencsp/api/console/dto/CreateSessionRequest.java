package io.hlab.opencsp.api.console.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateSessionRequest {
    @NotBlank
    private String crName;
    /** SSH 로그인 계정. 기본값: "root" */
    private String login = "root";
}
