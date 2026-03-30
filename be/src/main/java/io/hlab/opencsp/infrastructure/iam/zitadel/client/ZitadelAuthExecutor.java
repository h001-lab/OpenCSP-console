package io.hlab.opencsp.infrastructure.iam.zitadel.client;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import io.hlab.opencsp.infrastructure.iam.IamException;
import io.hlab.opencsp.infrastructure.iam.zitadel.dto.ZitadelAuthorizationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

/**
 * Zitadel Authorization v2 API 실행자
 * Authorization 관련 API 호출만 담당
 * 
 * <p>테스트 환경에서는 실제 Zitadel 서버가 없으므로 모킹하여 사용합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ZitadelAuthExecutor {

    private final ConfigStore configStore;
    private final WebClient.Builder webClientBuilder;

    // --- ConfigStore 헬퍼 (호출 시점마다 최신 DB 값 반영) ---

    private String issuerUri() {
        return configStore.get(ConfigCategory.IAM, "zitadel.issuer-uri", "");
    }

    private String apiToken() {
        return configStore.get(ConfigCategory.IAM, "zitadel.service-token", "");
    }

    private String orgId() {
        return configStore.get(ConfigCategory.IAM, "zitadel.org-id", "");
    }

    private String projectId() {
        return configStore.get(ConfigCategory.IAM, "zitadel.project-id", "");
    }

    /**
     * WebClient 인스턴스 생성 (공통 헤더 설정)
     */
    private WebClient createWebClient() {
        String issuerUri = issuerUri();
        if (issuerUri.isBlank()) {
            throw new IamException("zitadel.issuer-uri가 설정되지 않았습니다. Admin UI 또는 환경 변수를 확인하세요.");
        }
        String baseUrl;
        try {
            java.net.URI uri = java.net.URI.create(issuerUri);
            baseUrl = uri.getScheme() + "://" + uri.getAuthority();
        } catch (Exception e) {
            throw new IamException("zitadel.issuer-uri가 올바르지 않습니다: " + issuerUri);
        }
        String token = apiToken();
        if (token.isBlank()) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                token = jwtAuth.getToken().getTokenValue();
            }
        }
        return webClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + token)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Connect-Protocol-Version", "1")
                .build();
    }

    /**
     * Zitadel Authorization 생성 (CreateAuthorization)
     * user의 Authorization이 이미 존재하는 경우엔 오류 발생 (409 Conflict 였던 것 같음)
     */
    public ZitadelAuthorizationDto.CreateResponse createAuthorization(String userId, List<String> roleKeys) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.CreateRequest request = new ZitadelAuthorizationDto.CreateRequest(
                userId,
                projectId(),
                orgId(),
                roleKeys
        );

        try {
            ZitadelAuthorizationDto.CreateResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/CreateAuthorization")
                    .header("x-zitadel-orgid", orgId())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.CreateResponse.class)
                    .block();

            log.debug("Authorization 생성 완료: userId={}, roleKeys={}", userId, roleKeys);
            return response;
        } catch (WebClientResponseException e) {
            log.error("Authorization 생성 실패: userId={}, roleKeys={}, status={}, body={}",
                    userId, roleKeys, e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("Authorization 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel Authorization 업데이트 (UpdateAuthorization)
     */
    public ZitadelAuthorizationDto.UpdateResponse updateAuthorization(String grantId, List<String> roleKeys) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.UpdateRequest request = new ZitadelAuthorizationDto.UpdateRequest(
                grantId,
                roleKeys
        );

        try {
            ZitadelAuthorizationDto.UpdateResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/UpdateAuthorization")
                    .header("x-zitadel-orgid", orgId())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.UpdateResponse.class)
                    .block();

            log.debug("Authorization 업데이트 완료: grantId={}, roleKeys={}", grantId, roleKeys);
            return response;
        } catch (WebClientResponseException e) {
            log.error("Authorization 업데이트 실패: grantId={}, roleKeys={}, status={}, body={}",
                    grantId, roleKeys, e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("Authorization 업데이트 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel Authorization 전체 목록 조회 (ListAuthorizations)
     * inUserIds 필터가 Zitadel에서 무시되는 문제로 인해 전체 조회 후 Java에서 필터링
     */
    public ZitadelAuthorizationDto.ListResponse listAllAuthorizations() throws IamException {
        WebClient webClient = createWebClient();

        ZitadelAuthorizationDto.ListRequest.PaginationRequest pagination =
                new ZitadelAuthorizationDto.ListRequest.PaginationRequest(1000, null, true);

        ZitadelAuthorizationDto.ListRequest request = new ZitadelAuthorizationDto.ListRequest(
                pagination,
                null,
                null
        );

        try {
            ZitadelAuthorizationDto.ListResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/ListAuthorizations")
                    .header("x-zitadel-orgid", orgId())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.ListResponse.class)
                    .block();
            log.debug("Authorization 전체 목록 조회 완료: count={}", response != null && response.authorizations() != null ? response.authorizations().size() : 0);
            return response;
        } catch (WebClientResponseException e) {
            log.error("Authorization 목록 조회 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("Authorization 목록 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel Authorization 삭제 (DeleteAuthorization)
     */
    public ZitadelAuthorizationDto.DeleteResponse deleteAuthorization(String grantId) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.DeleteRequest request = new ZitadelAuthorizationDto.DeleteRequest(grantId);

        try {
            ZitadelAuthorizationDto.DeleteResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/DeleteAuthorization")
                    .header("x-zitadel-orgid", orgId())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.DeleteResponse.class)
                    .block();

            log.debug("Authorization 삭제 완료: grantId={}", grantId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("Authorization 삭제 실패: grantId={}, status={}, body={}",
                    grantId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("Authorization 삭제 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel Authorization 활성화 (ActivateAuthorization)
     */
    public ZitadelAuthorizationDto.ActivateResponse activateAuthorization(String grantId) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.ActivateRequest request = new ZitadelAuthorizationDto.ActivateRequest(grantId);

        try {
            ZitadelAuthorizationDto.ActivateResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/ActivateAuthorization")
                    .header("x-zitadel-orgid", orgId())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.ActivateResponse.class)
                    .block();

            log.debug("Authorization 활성화 완료: grantId={}", grantId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("Authorization 활성화 실패: grantId={}, status={}, body={}",
                    grantId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("Authorization 활성화 실패: " + e.getMessage(), e);
        }
    }

    /**
     * Zitadel Authorization 비활성화 (DeactivateAuthorization)
     */
    public ZitadelAuthorizationDto.DeactivateResponse deactivateAuthorization(String grantId) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.DeactivateRequest request = new ZitadelAuthorizationDto.DeactivateRequest(grantId);

        try {
            ZitadelAuthorizationDto.DeactivateResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/DeactivateAuthorization")
                    .header("x-zitadel-orgid", orgId())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.DeactivateResponse.class)
                    .block();

            log.debug("Authorization 비활성화 완료: grantId={}", grantId);
            return response;
        } catch (WebClientResponseException e) {
            log.error("Authorization 비활성화 실패: grantId={}, status={}, body={}",
                    grantId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new IamException("Authorization 비활성화 실패: " + e.getMessage(), e);
        }
    }
}

