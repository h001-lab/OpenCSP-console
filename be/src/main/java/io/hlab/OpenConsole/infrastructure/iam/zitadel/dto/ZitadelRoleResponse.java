package io.hlab.OpenConsole.infrastructure.iam.zitadel.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Zitadel Management API Role 응답 DTO
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ZitadelRoleResponse {
    private List<ZitadelRole> result;
    
    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ZitadelRole {
        private String roleKey;
        private String projectId;
    }
}

