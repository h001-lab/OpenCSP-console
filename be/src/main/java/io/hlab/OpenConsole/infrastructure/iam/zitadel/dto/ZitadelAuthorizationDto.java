package io.hlab.OpenConsole.infrastructure.iam.zitadel.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Zitadel Authorization v2 API DTOs
 * 모든 Authorization 관련 Request/Response를 record로 정의
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ZitadelAuthorizationDto {

    // ==================== ListAuthorizations ====================
    
    public record ListRequest(
            PaginationRequest pagination,
            @JsonProperty("sortingColumn") AuthorizationFieldName sortingColumn,
            List<AuthorizationsSearchFilter> filters
    ) {
        public record PaginationRequest(
                Integer limit,
                Integer offset,
                Boolean asc
        ) {}

        public enum AuthorizationFieldName {
            AUTHORIZATION_FIELD_NAME_UNSPECIFIED,
            AUTHORIZATION_FIELD_NAME_CREATION_DATE,
            AUTHORIZATION_FIELD_NAME_CHANGE_DATE
        }

        @JsonInclude(JsonInclude.Include.NON_NULL) // 보낼 때: null 필드 제외
        @JsonIgnoreProperties(ignoreUnknown = true) // 받을 때: 모르는 필드 무시 (안전장치)
        public record AuthorizationsSearchFilter(
                AuthorizationIdsFilter authorizationIds,
                InUserIdsFilter inUserIds,
                OrganizationIdFilter organizationId,
                ProjectGrantIdFilter projectGrantId,
                ProjectIdFilter projectId,
                ProjectNameFilter projectName,
                RoleKeyFilter roleKey,
                StateFilter state,
                UserDisplayNameFilter userDisplayName,
                UserOrganizationIdFilter userOrganizationId,
                UserPreferredLoginNameFilter userPreferredLoginName
        ) {
            public record AuthorizationIdsFilter(List<String> ids) {}
            public record InUserIdsFilter(List<String> ids) {}
            public record OrganizationIdFilter(String id) {}
            public record ProjectGrantIdFilter(String id) {}
            public record ProjectIdFilter(String id) {}
            public record ProjectNameFilter(String name, TextFilterMethod method) {}
            public record RoleKeyFilter(String key, TextFilterMethod method) {}
            public record StateFilter(AuthorizationState state) {}
            public record UserDisplayNameFilter(String displayName, TextFilterMethod method) {}
            public record UserOrganizationIdFilter(String id) {}
            public record UserPreferredLoginNameFilter(String loginName, TextFilterMethod method) {}
        }

        public enum TextFilterMethod {
            TEXT_FILTER_METHOD_EQUALS,
            TEXT_FILTER_METHOD_EQUALS_IGNORE_CASE,
            TEXT_FILTER_METHOD_STARTS_WITH,
            TEXT_FILTER_METHOD_STARTS_WITH_IGNORE_CASE,
            TEXT_FILTER_METHOD_CONTAINS,
            TEXT_FILTER_METHOD_CONTAINS_IGNORE_CASE,
            TEXT_FILTER_METHOD_ENDS_WITH,
            TEXT_FILTER_METHOD_ENDS_WITH_IGNORE_CASE
        }

        public enum AuthorizationState {
            AUTHORIZATION_STATE_UNSPECIFIED,
            AUTHORIZATION_STATE_ACTIVE,
            AUTHORIZATION_STATE_INACTIVE
        }
    }

    public record ListResponse(
            PaginationResponse pagination,
            List<Authorization> authorizations
    ) {
        public record PaginationResponse(
                Integer limit,
                Integer offset,
                Long totalResult
        ) {}

        public record Authorization(
                String id,
                @JsonProperty("userId") String userId,
                @JsonProperty("projectId") String projectId,
                @JsonProperty("organizationId") String organizationId,
                @JsonProperty("roleKeys") List<String> roleKeys,
                String state,
                String creationDate,
                String changeDate
        ) {}
    }

    // ==================== CreateAuthorization ====================
    
    public record CreateRequest(
            @JsonProperty("userId") String userId,
            @JsonProperty("projectId") String projectId,
            @JsonProperty("organizationId") String organizationId,
            @JsonProperty("roleKeys") List<String> roleKeys
    ) {}

    public record CreateResponse(
            String id,
            String creationDate
    ) {}

    // ==================== UpdateAuthorization ====================
    
    public record UpdateRequest(
            String id,
            @JsonProperty("roleKeys") List<String> roleKeys
    ) {}

    public record UpdateResponse(
            String changeDate
    ) {}

    // ==================== DeleteAuthorization ====================
    
    public record DeleteRequest(
            String id
    ) {}

    public record DeleteResponse(
            String deletionDate
    ) {}

    // ==================== ActivateAuthorization ====================
    
    public record ActivateRequest(
            String id
    ) {}

    public record ActivateResponse(
            String changeDate
    ) {}

    // ==================== DeactivateAuthorization ====================
    
    public record DeactivateRequest(
            String id
    ) {}

    public record DeactivateResponse(
            String changeDate
    ) {}
}

