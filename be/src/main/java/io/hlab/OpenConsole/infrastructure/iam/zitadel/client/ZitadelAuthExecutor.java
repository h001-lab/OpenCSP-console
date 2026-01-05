package io.hlab.OpenConsole.infrastructure.iam.zitadel.client;

import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.dto.ZitadelAuthorizationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

/**
 * Zitadel Authorization v2 API 실행자
 * Authorization 관련 API 호출만 담당
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ZitadelAuthExecutor {

    @Value("${zitadel.domain}")
    private String zitadelDomain;

    @Value("${zitadel.org-id}")
    private String orgId;

    @Value("${zitadel.project-id}")
    private String projectId;

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
     * Zitadel Authorization 생성 (CreateAuthorization)
     * user의 Authorization이 이미 존재하는 경우엔 오류 발생 (409 Conflict 였던 것 같음)
     */
    public ZitadelAuthorizationDto.CreateResponse createAuthorization(String userId, List<String> roleKeys) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.CreateRequest request = new ZitadelAuthorizationDto.CreateRequest(
                userId,
                projectId,
                orgId,
                roleKeys
        );

        try {
            ZitadelAuthorizationDto.CreateResponse response = webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/CreateAuthorization")
                    .header("x-zitadel-orgid", this.orgId)
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
                    .header("x-zitadel-orgid", this.orgId)
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
     * Zitadel Authorization 목록 조회 (ListAuthorizations)
     */
    public ZitadelAuthorizationDto.ListResponse listAuthorizations(String userId) throws IamException {
        WebClient webClient = createWebClient();
        
        ZitadelAuthorizationDto.ListRequest.PaginationRequest pagination = 
                new ZitadelAuthorizationDto.ListRequest.PaginationRequest(100, null, true);
        
        ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter.InUserIdsFilter inUserIdsFilter = 
                new ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter.InUserIdsFilter(List.of(userId));
        
        ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter.ProjectIdFilter projectIdFilter = 
                new ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter.ProjectIdFilter(projectId);
        
        ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter.OrganizationIdFilter orgIdFilter = 
                new ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter.OrganizationIdFilter(orgId);
        
        ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter filter1 = 
                new ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter(
                        null, inUserIdsFilter, null, null, projectIdFilter, null, null, null, null, null, null);
        
        ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter filter2 = 
                new ZitadelAuthorizationDto.ListRequest.AuthorizationsSearchFilter(
                        null, null, orgIdFilter, null, null, null, null, null, null, null, null);
        
        ZitadelAuthorizationDto.ListRequest request = new ZitadelAuthorizationDto.ListRequest(
                pagination,
                ZitadelAuthorizationDto.ListRequest.AuthorizationFieldName.AUTHORIZATION_FIELD_NAME_UNSPECIFIED,
                List.of(filter1, filter2)
        );

        try {
            return webClient.post()
                    .uri("/zitadel.authorization.v2.AuthorizationService/ListAuthorizations")
                    .header("x-zitadel-orgid", this.orgId)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(ZitadelAuthorizationDto.ListResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Authorization 목록 조회 실패: userId={}, status={}, body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
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
                    .header("x-zitadel-orgid", this.orgId)
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
                    .header("x-zitadel-orgid", this.orgId)
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
                    .header("x-zitadel-orgid", this.orgId)
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

