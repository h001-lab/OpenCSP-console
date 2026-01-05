package io.hlab.OpenConsole.infrastructure.iam.zitadel.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;

/**
 * Zitadel 사용자 조회 응답 DTO
 */
@Getter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ZitadelUserResponse {
    private ZitadelUserResult result;

    @Getter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ZitadelUserResult {
        private String id;  // subject
        private String email;
        private String userName;
    }
}

