package io.hlab.OpenConsole.infrastructure.iam.zitadel.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Zitadel User v2 API DTOs
 * 모든 User 관련 Request/Response를 record로 정의
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ZitadelUserDto {

    // ==================== ListUsers ====================
    
    public record ListUsersRequest(
            @JsonProperty("query") Query query,
            @JsonProperty("sortingColumn") String sortingColumn,
            @JsonProperty("queries") List<Map<String, Object>> queries
    ) {
        public record Query(
                Integer offset,
                Integer limit,
                Boolean asc
        ) {}
    }

    public record ListUsersResponse(
            @JsonProperty("details") Details details,
            @JsonProperty("sortingColumn") String sortingColumn,
            @JsonProperty("result") List<User> result
    ) {
        public record Details(
                Long totalResult,
                Integer processedSequence,
                Long viewTimestamp
        ) {}
        
        public record User(
                @JsonProperty("id") String id,
                @JsonProperty("userId") String userId,
                @JsonProperty("username") String username,
                @JsonProperty("state") String state,
                @JsonProperty("human") Human human,
                @JsonProperty("machine") Machine machine
        ) {
            public record Human(
                    @JsonProperty("profile") Profile profile,
                    @JsonProperty("email") Email email,
                    @JsonProperty("phone") Phone phone
            ) {
                public record Profile(
                        @JsonProperty("givenName") String givenName,
                        @JsonProperty("familyName") String familyName,
                        @JsonProperty("displayName") String displayName,
                        @JsonProperty("preferredLanguage") String preferredLanguage
                ) {}
                
                public record Email(
                        @JsonProperty("email") String email,
                        @JsonProperty("isEmailVerified") Boolean isEmailVerified
                ) {}
                
                public record Phone(
                        @JsonProperty("phone") String phone,
                        @JsonProperty("isPhoneVerified") Boolean isPhoneVerified
                ) {}
            }
            
            public record Machine(
                    @JsonProperty("name") String name,
                    @JsonProperty("description") String description
            ) {}
        }
    }

    // ==================== GetUserByID ====================
    
    public record GetUserByIDResponse(
            @JsonProperty("details") Details details,
            @JsonProperty("user") ListUsersResponse.User user
    ) {
        public record Details(
                Long sequence,
                Long creationDate,
                Long changeDate,
                String resourceOwner
        ) {}
    }

    // ==================== CreateUser ====================
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreateUserRequest(
            @JsonProperty("organizationId") String organizationId,
            @JsonProperty("userId") String userId,
            @JsonProperty("username") String username,
            @JsonProperty("human") Human human
    ) {
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record Human(
                @JsonProperty("profile") Profile profile,
                @JsonProperty("email") Email email,
                @JsonProperty("phone") Phone phone,
                @JsonProperty("password") Password password
        ) {
            public record Profile(
                    @JsonProperty("givenName") String givenName,
                    @JsonProperty("familyName") String familyName,
                    @JsonProperty("displayName") String displayName,
                    @JsonProperty("preferredLanguage") String preferredLanguage
            ) {}
            
            public record Email(
                    @JsonProperty("email") String email,
                    @JsonProperty("isEmailVerified") Boolean isEmailVerified,
                    @JsonProperty("sendCode") SendCode sendCode,
                    @JsonProperty("returnCode") ReturnCode returnCode
            ) {
                public record SendCode(
                        @JsonProperty("urlTemplate") String urlTemplate
                ) {}
                
                public record ReturnCode() {}
            }
            
            public record Phone(
                    @JsonProperty("phone") String phone,
                    @JsonProperty("isPhoneVerified") Boolean isPhoneVerified
            ) {}
            
            public record Password(
                    @JsonProperty("password") String password,
                    @JsonProperty("changeRequired") Boolean changeRequired
            ) {}
        }
    }

    public record CreateUserResponse(
            @JsonProperty("id") String id,
            @JsonProperty("creationDate") String creationDate,
            @JsonProperty("emailCode") String emailCode,
            @JsonProperty("phoneCode") String phoneCode
    ) {}

    // ==================== DeleteUser ====================
    
    public record DeleteUserResponse(
            @JsonProperty("details") GetUserByIDResponse.Details details
    ) {}

    // ==================== DeactivateUser ====================
    
    public record DeactivateUserResponse(
            @JsonProperty("details") GetUserByIDResponse.Details details
    ) {}

    // ==================== LockUser ====================
    
    public record LockUserResponse(
            @JsonProperty("details") GetUserByIDResponse.Details details
    ) {}

    // ==================== UnlockUser ====================
    
    public record UnlockUserResponse(
            @JsonProperty("details") GetUserByIDResponse.Details details
    ) {}

    // ==================== SetUserMetadata ====================
    
    public record SetUserMetadataRequest(
            @JsonProperty("metadata") List<Metadata> metadata
    ) {
        public record Metadata(
                @JsonProperty("key") String key,
                @JsonProperty("value") String value  // base64 encoded
        ) {}
    }

    public record SetUserMetadataResponse(
            @JsonProperty("setDate") String setDate
    ) {}

    // ==================== CreateInviteCode ====================
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreateInviteCodeRequest(
            @JsonProperty("sendCode") SendCode sendCode,
            @JsonProperty("returnCode") ReturnCode returnCode
    ) {
        public record SendCode(
                @JsonProperty("urlTemplate") String urlTemplate
        ) {}
        
        public record ReturnCode() {}
    }

    public record CreateInviteCodeResponse(
            @JsonProperty("details") GetUserByIDResponse.Details details,
            @JsonProperty("inviteCode") String inviteCode
    ) {}
}

