package io.hlab.OpenConsole.infrastructure.iam.zitadel.client;

import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.dto.ZitadelUserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Zitadel User v2 API 실행자
 * User 관련 API 호출만 담당
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ZitadelUserExecutor {

    @Value("${zitadel.domain}")
    private String zitadelDomain;

    @Value("${zitadel.org-id}")
    private String orgId;

    @Value("${zitadel.api-token}")
    private String apiToken;

    private final WebClient.Builder webClientBuilder;

    /**
     * WebClient 인스턴스 생성 (공통 헤더 설정)
     */
    private WebClient createWebClient() {
        return webClientBuilder
                .baseUrl("https://" + zitadelDomain)
                .defaultHeader("Authorization", "Bearer " + apiToken)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Connect-Protocol-Version", "1")
                .build();
    }

    /**
     * Zitadel 사용자 목록 조회 (ListUsers)
     * POST /v2/users
     */
    public ZitadelUserDto.ListUsersResponse listUsers(
            Integer offset, Integer limit, Boolean asc,
            String sortingColumn, List<Map<String, Object>> queries) throws IamException {
        WebClient webClient = createWebClient();

        ZitadelUserDto.ListUsersRequest.Query query = new ZitadelUserDto.ListUsersRequest.Query(
                offset, limit, asc
        );

        ZitadelUserDto.ListUsersRequest request = new ZitadelUserDto.ListUsersRequest(
                query, sortingColumn, queries
        );

        try {
            return webClient.post()
                    .uri("/v2/users")
                    .header("x-zitadel-orgid", this.orgId)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.ListUsersResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("사용자 목록 조회 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("사용자 목록 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Email로 사용자 검색 (ListUsers의 헬퍼 메소드)
     */
    public ZitadelUserDto.ListUsersResponse.User findUserByEmail(String email) throws IamException {
        List<Map<String, Object>> queries = List.of(
                Map.of("emailQuery", Map.of(
                        "emailAddress", email,
                        "method", "TEXT_QUERY_METHOD_EQUALS"
                ))
        );

        ZitadelUserDto.ListUsersResponse response = listUsers(0, 100, true, null, queries);

        if (response != null && response.result() != null && !response.result().isEmpty()) {
            return response.result().get(0);
        }

        throw new IamException("사용자를 찾을 수 없습니다: email=" + email);
    }

    /**
     * Zitadel 사용자 ID로 조회 (GetUserByID)
     * GET /v2/users/{user_id}
     */
    public ZitadelUserDto.GetUserByIDResponse getUserByID(String userId) throws IamException {
        WebClient webClient = createWebClient();

        try {
            return webClient.get()
                    .uri("/v2/users/{user_id}", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.GetUserByIDResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("사용자 조회 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("사용자 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 사용자 생성 (CreateUser - Human)
     * POST /v2/users/new
     */
    public ZitadelUserDto.CreateUserResponse createUser(ZitadelUserDto.CreateUserRequest request) throws IamException {
        WebClient webClient = createWebClient();

        try {
            ZitadelUserDto.CreateUserResponse response = webClient.post()
                    .uri("/v2/users/new")
                    .header("x-zitadel-orgid", this.orgId)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.CreateUserResponse.class)
                    .block();

            log.debug("사용자 생성 완료: userId={}", response.id());
            return response;
        } catch (WebClientResponseException e) {
            log.error("사용자 생성 실패: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("사용자 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 사용자 삭제 (DeleteUser)
     * DELETE /v2/users/{user_id}
     */
    public ZitadelUserDto.DeleteUserResponse deleteUser(String userId) throws IamException {
        WebClient webClient = createWebClient();

        try {
            ZitadelUserDto.DeleteUserResponse response = webClient.delete()
                    .uri("/v2/users/{user_id}", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.DeleteUserResponse.class)
                    .block();

            log.debug("사용자 삭제 완료: userId={}", userId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("사용자 삭제 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("사용자 삭제 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 사용자 비활성화 (DeactivateUser)
     * POST /v2/users/{user_id}/deactivate
     */
    public ZitadelUserDto.DeactivateUserResponse deactivateUser(String userId) throws IamException {
        WebClient webClient = createWebClient();

        try {
            ZitadelUserDto.DeactivateUserResponse response = webClient.post()
                    .uri("/v2/users/{user_id}/deactivate", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.DeactivateUserResponse.class)
                    .block();

            log.debug("사용자 비활성화 완료: userId={}", userId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("사용자 비활성화 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("사용자 비활성화 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 사용자 메타데이터 설정 (SetUserMetadata)
     * POST /v2/users/{user_id}/metadata
     */
    public ZitadelUserDto.SetUserMetadataResponse setUserMetadata(
            String userId, List<ZitadelUserDto.SetUserMetadataRequest.Metadata> metadata) throws IamException {
        WebClient webClient = createWebClient();

        ZitadelUserDto.SetUserMetadataRequest request = new ZitadelUserDto.SetUserMetadataRequest(metadata);

        try {
            ZitadelUserDto.SetUserMetadataResponse response = webClient.post()
                    .uri("/v2/users/{user_id}/metadata", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.SetUserMetadataResponse.class)
                    .block();

            log.debug("사용자 메타데이터 설정 완료: userId={}", userId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("사용자 메타데이터 설정 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("사용자 메타데이터 설정 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 사용자 잠금 (LockUser)
     * POST /v2/users/{user_id}/lock
     */
    public ZitadelUserDto.LockUserResponse lockUser(String userId) throws IamException {
        WebClient webClient = createWebClient();

        try {
            ZitadelUserDto.LockUserResponse response = webClient.post()
                    .uri("/v2/users/{user_id}/lock", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.LockUserResponse.class)
                    .block();

            log.debug("사용자 잠금 완료: userId={}", userId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("사용자 잠금 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("사용자 잠금 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 사용자 잠금 해제 (UnlockUser)
     * POST /v2/users/{user_id}/unlock
     */
    public ZitadelUserDto.UnlockUserResponse unlockUser(String userId) throws IamException {
        WebClient webClient = createWebClient();

        try {
            ZitadelUserDto.UnlockUserResponse response = webClient.post()
                    .uri("/v2/users/{user_id}/unlock", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.UnlockUserResponse.class)
                    .block();

            log.debug("사용자 잠금 해제 완료: userId={}", userId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("사용자 잠금 해제 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("사용자 잠금 해제 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel 초대 코드 생성 (CreateInviteCode)
     * POST /v2/users/{user_id}/invite_code
     */
    public ZitadelUserDto.CreateInviteCodeResponse createInviteCode(
            String userId, ZitadelUserDto.CreateInviteCodeRequest request) throws IamException {
        WebClient webClient = createWebClient();

        try {
            ZitadelUserDto.CreateInviteCodeResponse response = webClient.post()
                    .uri("/v2/users/{user_id}/invite_code", userId)
                    .header("x-zitadel-orgid", this.orgId)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelUserDto.CreateInviteCodeResponse.class)
                    .block();

            log.debug("초대 코드 생성 완료: userId={}", userId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("초대 코드 생성 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode().value() == 404) {
                throw new IamException("사용자를 찾을 수 없습니다: userId=" + userId, e);
            }
            throw new IamException("초대 코드 생성 실패: " + e.getMessage(), e);
        }
    }
}

