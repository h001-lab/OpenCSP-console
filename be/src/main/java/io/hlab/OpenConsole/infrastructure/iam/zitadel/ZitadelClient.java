package io.hlab.OpenConsole.infrastructure.iam.zitadel;

import io.hlab.OpenConsole.infrastructure.iam.IamClient;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.client.ZitadelAuthExecutor;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.client.ZitadelUserExecutor;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.dto.ZitadelAuthorizationDto;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.dto.ZitadelUserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Zitadel Management API 클라이언트 구현체 (Facade)
 * IamClient 인터페이스를 구현하며, 내부적으로 ZitadelAuthExecutor 등을 사용
 * 서비스 로직만 담당하고, 실제 API 호출은 Executor에 위임
 * 
 * <h3>예외 처리 패턴</h3>
 * <ul>
 *   <li><b>IamException</b>: Executor에서 이미 IamException으로 변환되어 전파되므로,
 *       비즈니스 로직(예: 409 Conflict 처리)이 필요한 경우에만 catch하고 처리합니다.
 *       그 외에는 그대로 전파합니다. 로깅은 GlobalExceptionHandler에서 수행합니다.</li>
 *   <li><b>Executor의 예외 처리</b>: ZitadelAuthExecutor와 ZitadelUserExecutor에서
 *       WebClientResponseException을 catch하고 IamException으로 래핑하므로,
 *       이 클래스에서는 추가적인 예외 래핑이 불필요합니다.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ZitadelClient implements IamClient {

    @Value("${zitadel.domain}")
    private String zitadelDomain;

    @Value("${zitadel.org-id}")
    private String orgId;

    @Value("${zitadel.api-token}")
    private String apiToken;

    private final ZitadelAuthExecutor authExecutor;
    private final ZitadelUserExecutor userExecutor;

    @Override
    public void assignRole(String userId, IamRole role) throws IamException {
        assignRoles(userId, List.of(role));
    }

    @Override
    public void assignRoles(String userId, List<IamRole> roles) throws IamException {
        log.info("Zitadel에 role 부여 요청: userId={}, roles={}", userId, roles);

        List<String> roleKeys = roles.stream()
                .map(IamRole::getValue)
                .toList();

        try {
            // 먼저 CreateAuthorization 시도 (grant가 없는 경우)
            authExecutor.createAuthorization(userId, roleKeys);
            log.info("Zitadel role 부여 완료 (새 grant 생성): userId={}, roles={}", userId, roles);

        } catch (IamException e) {
            // IamException의 원인을 확인하여 409 Conflict인지 체크
            if (e.getCause() instanceof WebClientResponseException cause) {
                if (cause.getStatusCode().value() == 409) {
                    // grant가 이미 존재하면 기존 role과 병합하여 UpdateAuthorization 사용
                    log.info("Grant가 이미 존재하여 기존 role과 병합 후 업데이트 시도: userId={}, roles={}", userId, roles);
                    
                    // 1. 현재 grant ID 조회
                    String grantId = findAuthorizationId(userId)
                            .orElseThrow(() -> new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId));
                    
                    // 2. 현재 roleKeys 조회
                    List<String> currentRoleKeys = getCurrentRoleKeys(userId);
                    
                    // 3. 기존 roleKeys와 요청한 roleKeys 병합 (중복 제거)
                    List<String> mergedRoleKeys = new ArrayList<>(currentRoleKeys);
                    for (String roleKey : roleKeys) {
                        if (!mergedRoleKeys.contains(roleKey)) {
                            mergedRoleKeys.add(roleKey);
                        }
                    }
                    
                    // 4. UpdateAuthorization으로 업데이트
                    authExecutor.updateAuthorization(grantId, mergedRoleKeys);
                    
                    log.info("Zitadel role 부여 완료 (기존 grant 업데이트): userId={}, grantId={}, 기존 roles={}, 추가 roles={}, 최종 roles={}", 
                            userId, grantId, currentRoleKeys, roleKeys, mergedRoleKeys);
                } else {
                    // 409가 아닌 다른 IamException은 그대로 전파
                    throw e;
                }
            } else {
                // WebClientResponseException이 아닌 경우 그대로 전파
                throw e;
            }
        }
    }

    @Override
    public void removeRole(String userId, IamRole role) throws IamException {
        log.info("Zitadel에서 role 제거 요청: userId={}, role={}", userId, role);

        // 1. 현재 grant ID 조회
        String grantId = findAuthorizationId(userId)
                .orElseThrow(() -> new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId));
        
        // 2. 현재 roleKeys 조회
        List<String> currentRoleKeys = getCurrentRoleKeys(userId);
        
        // 3. 제거할 roleKey를 현재 roleKeys에서 제거
        List<String> updatedRoleKeys = currentRoleKeys.stream()
                .filter(roleKey -> !roleKey.equals(role.getValue()))
                .toList();

        // 4. UpdateAuthorization으로 업데이트
        authExecutor.updateAuthorization(grantId, updatedRoleKeys);

        log.info("Zitadel role 제거 완료: userId={}, grantId={}, removedRole={}, remainingRoles={}", 
                userId, grantId, role, updatedRoleKeys);
    }

    @Override
    public List<IamRole> getUserRoles(String userId) throws IamException {
        log.info("Zitadel에서 사용자 role 조회: userId={}", userId);

        ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
        
        // 응답에서 roleKeys 추출하여 IamRole 리스트로 변환
        List<IamRole> roles = new ArrayList<>();
        if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
            ZitadelAuthorizationDto.ListResponse.Authorization authorization = response.authorizations().get(0);
            if (authorization.roleKeys() != null) {
                for (String roleKey : authorization.roleKeys()) {
                    IamRole iamRole = IamRole.fromString(roleKey);
                    if (iamRole != null && !roles.contains(iamRole)) {
                        roles.add(iamRole);
                    }
                }
            }
        }
        
        log.info("Zitadel role 조회 완료: userId={}, roles={}", userId, roles);
        return roles;
    }

    @Override
    public String getUserSubjectByEmail(String email) throws IamException {
        log.info("Zitadel에서 email로 사용자 조회: email={}", email);

        ZitadelUserDto.ListUsersResponse.User user = userExecutor.findUserByEmail(email);
        
        // id 또는 userId 필드에서 subject 추출
        String subject = user.id() != null ? user.id() : user.userId();
        
        if (subject != null && !subject.isBlank()) {
            log.info("Zitadel 사용자 조회 성공: email={}, subject={}", email, subject);
            return subject;
        }
        
        throw new IamException("사용자 ID를 찾을 수 없습니다: email=" + email);
    }

    @Override
    public String getUserEmailBySubject(String subject) throws IamException {
        log.info("Zitadel에서 subject로 사용자 조회: subject={}", subject);

        ZitadelUserDto.GetUserByIDResponse response = userExecutor.getUserByID(subject);
        
        if (response != null && response.user() != null) {
            ZitadelUserDto.ListUsersResponse.User user = response.user();
            
            // Human 타입 사용자의 email 추출
            if (user.human() != null && user.human().email() != null) {
                String email = user.human().email().email();
                if (email != null && !email.isBlank()) {
                    log.info("Zitadel 사용자 조회 성공: subject={}, email={}", subject, email);
                    return email;
                }
            }
        }

        throw new IamException("사용자 email을 찾을 수 없습니다: subject=" + subject);
    }

    /**
     * Authorization ID 조회 (헬퍼 메소드)
     * grantId를 찾아서 Optional로 반환합니다. 검증은 호출하는 쪽에서 담당합니다.
     */
    private Optional<String> findAuthorizationId(String userId) throws IamException {
        ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
        
        if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
            ZitadelAuthorizationDto.ListResponse.Authorization firstGrant = response.authorizations().get(0);
            String grantId = firstGrant.id();
            if (grantId != null && !grantId.isBlank()) {
                log.debug("Authorization ID 조회 완료: userId={}, grantId={}", userId, grantId);
                return Optional.of(grantId);
            }
        }

        return Optional.empty();
    }

    /**
     * 현재 사용자의 roleKeys 조회 (헬퍼 메소드)
     */
    private List<String> getCurrentRoleKeys(String userId) throws IamException {
        ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
        List<String> currentRoleKeys = new ArrayList<>();
        
        if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
            ZitadelAuthorizationDto.ListResponse.Authorization authorization = response.authorizations().get(0);
            if (authorization.roleKeys() != null) {
                currentRoleKeys = new ArrayList<>(authorization.roleKeys());
            }
        }
        
        return currentRoleKeys;
    }
}

