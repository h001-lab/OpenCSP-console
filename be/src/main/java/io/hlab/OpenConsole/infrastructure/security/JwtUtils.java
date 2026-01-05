package io.hlab.OpenConsole.infrastructure.security;

import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import io.hlab.OpenConsole.infrastructure.iam.IamTokenDecoder;
import io.hlab.OpenConsole.infrastructure.iam.IamUserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * JWT 유틸리티
 * SecurityContext에서 JWT를 읽어서 사용자 정보와 role을 추출
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtUtils {

    private final IamTokenDecoder iamTokenDecoder;

    /**
     * 현재 SecurityContext에서 JWT를 가져옴
     * 
     * @return JWT 또는 null (인증되지 않은 경우)
     */
    public Jwt getJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.debug("Current authentication type: {}", authentication != null ? authentication.getClass().getName() : "null");
        
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            log.debug("JWT found in SecurityContext");
            return jwtAuth.getToken();
        }
        
        log.warn("JWT not found in SecurityContext. Authentication: {}", authentication);
        return null;
    }

    /**
     * 현재 SecurityContext에서 사용자 정보 추출
     * 
     * @return IamUserInfo 또는 null
     */
    public IamUserInfo getCurrentUserInfo() {
        Jwt jwt = getJwt();
        if (jwt == null) {
            return null;
        }

        Map<String, Object> claims = jwt.getClaims();
        return iamTokenDecoder.fromClaims(claims);
    }

    /**
     * 현재 사용자의 email 추출
     * 
     * JWT에서 email 클레임을 추출합니다.
     * 
     * 참고: JWT에 email이 없는 경우 Zitadel 설정에서 email 클레임을 토큰에 포함하도록 설정해야 합니다.
     * - Zitadel Console > Project > Application > 해당 클라이언트 > Token Settings
     * - "User Info" 또는 "Claims" 설정에서 email 클레임 추가
     * 
     * @return email 또는 null (JWT에 email이 없는 경우)
     */
    public String getCurrentUserEmail() {
        Jwt jwt = getJwt();
        if (jwt == null) {
            log.debug("JWT is null in getCurrentUserEmail");
            return null;
        }
        
        // 1. JWT에서 직접 email 추출 시도
        String email = jwt.getClaimAsString("email");
        log.debug("Extracted email from JWT: {}", email);
        
        // 2. JWT에 email이 없으면 다른 클레임에서 찾기 시도 (방어적 프로그래밍)
        if (email == null) {
            log.warn("Email claim not found in JWT. Available claims: {}", jwt.getClaims().keySet());
            
            // Zitadel의 경우 email이 다른 클레임에 있을 수 있음
            // 예: "preferred_username", "username" 등
            email = jwt.getClaimAsString("preferred_username");
            if (email != null && email.contains("@")) {
                log.debug("Found email in 'preferred_username' claim: {}", email);
                return email;
            }
            
            // email이 없으면 null 반환 (Zitadel 설정 확인 필요)
            log.error("Email not found in JWT. Please configure Zitadel to include email claim in JWT token.");
        }
        
        return email;
    }

    /**
     * 현재 사용자의 subject 추출 (IAM API 호출용)
     * 
     * @return subject 또는 null
     */
    public String getCurrentUserSubject() {
        Jwt jwt = getJwt();
        if (jwt == null) {
            return null;
        }
        return jwt.getSubject();
    }

    /**
     * 현재 사용자의 role 목록 추출
     * 
     * JWT에서 role을 추출합니다.
     * Zitadel Project role은 OAuth2 scope로 요청하면 JWT에 포함됩니다.
     * 
     * @return role 목록
     */
    public List<IamRole> getCurrentUserRoles() {
        Jwt jwt = getJwt();
        if (jwt == null) {
            return List.of();
        }

        Map<String, Object> claims = jwt.getClaims();
        return extractRoles(claims);
    }

    /**
     * JWT claims에서 role 목록 추출
     * 
     * Zitadel의 role 클레임은 다음과 같은 형태로 나타날 수 있습니다:
     * 1. 배열 형태: ["admin", "userA"]
     * 2. 객체 형태: {"user": {"351864415584321539": "idp.avgmax.team"}}
     * 
     * @param claims JWT claims
     * @return role 목록
     */
    @SuppressWarnings("unchecked")
    private List<IamRole> extractRoles(Map<String, Object> claims) {
        List<IamRole> roles = new ArrayList<>();

        // 디버깅: 모든 claims 로깅 (실제 환경에서 role 클레임 위치 확인용)
        log.debug("JWT Claims 전체: {}", claims);
        
        // 1. "roles" 클레임 확인 (배열 형태)
        Object rolesClaim = claims.get("roles");
        if (rolesClaim instanceof List) {
            log.debug("Found 'roles' claim (List): {}", rolesClaim);
            ((List<?>) rolesClaim).forEach(role -> {
                if (role instanceof String) {
                    log.debug("Processing role from 'roles' claim: {}", role);
                    IamRole iamRole = IamRole.fromString((String) role);
                    if (iamRole != null) {
                        roles.add(iamRole);
                        log.debug("Successfully converted role: {} -> {}", role, iamRole);
                    } else {
                        log.warn("Failed to convert role: {}", role);
                    }
                }
            });
        }

        // 2. "urn:zitadel:iam:org:project:roles" 형태의 클레임 확인
        // 객체 형태: {"user": {"351864415584321539": "idp.avgmax.team"}}
        log.debug("Checking all claims for role-related keys...");
        claims.forEach((key, value) -> {
            if (key.contains("roles") && !key.equals("roles")) {
                log.info("Found role claim with key '{}': {}", key, value);
                
                // 배열 형태 처리
                if (value instanceof List) {
                    ((List<?>) value).forEach(role -> {
                        if (role instanceof String) {
                            log.debug("Processing role from '{}' claim (List): {}", key, role);
                            IamRole iamRole = IamRole.fromString((String) role);
                            if (iamRole != null && !roles.contains(iamRole)) {
                                roles.add(iamRole);
                                log.debug("Successfully converted role: {} -> {}", role, iamRole);
                            } else if (iamRole == null) {
                                log.warn("Failed to convert role from '{}': {}", key, role);
                            }
                        }
                    });
                }
                // 객체 형태 처리: {"user": {"351864415584321539": "idp.avgmax.team"}}
                else if (value instanceof Map) {
                    Map<String, Object> roleMap = (Map<String, Object>) value;
                    roleMap.forEach((roleName, roleValue) -> {
                        log.debug("Processing role from '{}' claim (Object): roleName={}, roleValue={}", 
                                key, roleName, roleValue);
                        IamRole iamRole = IamRole.fromString(roleName);
                        if (iamRole != null && !roles.contains(iamRole)) {
                            roles.add(iamRole);
                            log.debug("Successfully converted role: {} -> {}", roleName, iamRole);
                        } else if (iamRole == null) {
                            log.warn("Failed to convert role from '{}': roleName={}", key, roleName);
                        }
                    });
                }
            }
        });

        log.info("Extracted roles from JWT: {}", roles);
        return roles;
    }

    /**
     * 현재 사용자가 특정 role을 가지고 있는지 확인
     * 
     * @param role 확인할 role
     * @return role을 가지고 있으면 true
     */
    public boolean hasRole(IamRole role) {
        return getCurrentUserRoles().contains(role);
    }

    /**
     * 현재 사용자가 여러 role 중 하나라도 가지고 있는지 확인
     * 
     * @param roles 확인할 role 목록
     * @return 하나라도 가지고 있으면 true
     */
    public boolean hasAnyRole(IamRole... roles) {
        List<IamRole> userRoles = getCurrentUserRoles();
        for (IamRole role : roles) {
            if (userRoles.contains(role)) {
                return true;
            }
        }
        return false;
    }
}

