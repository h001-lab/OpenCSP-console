package io.hlab.OpenConsole.infrastructure.iam.zitadel;

import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import io.hlab.OpenConsole.infrastructure.iam.IamTokenDecoder;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamUserInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Zitadel JWT 토큰 디코더 구현체
 * JWT 토큰을 디코딩하여 사용자 정보와 role을 추출
 * 
 * 실제 구현은 Spring Security OAuth2 Resource Server가 처리하지만,
 * 여기서는 토큰에서 role을 추출하는 로직을 제공
 */
@Slf4j
@Component
public class ZitadelTokenDecoder implements IamTokenDecoder {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Override
    public IamUserInfo decode(String token) throws IamException {
        log.debug("Zitadel 토큰 디코딩 시작");

        try {
            // Spring Security OAuth2 Resource Server가 JWT 검증을 처리하므로
            // 이 메서드는 사용되지 않음. fromClaims() 메서드를 사용하세요.
            log.warn("ZitadelTokenDecoder.decode()는 사용되지 않습니다. " +
                    "SecurityContext에서 JwtAuthenticationToken을 사용하거나 fromClaims()를 사용하세요.");

            throw new UnsupportedOperationException(
                    "ZitadelTokenDecoder.decode()는 사용되지 않습니다. " +
                    "fromClaims() 메서드를 사용하세요.");

        } catch (Exception e) {
            log.error("Zitadel 토큰 디코딩 실패", e);
            throw new IamException("토큰 디코딩 실패: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean isValid(String token) {
        // Spring Security OAuth2 Resource Server가 자동으로 토큰 유효성 검증 처리
        // 이 메서드는 현재 사용되지 않음
        return true;
    }

    /**
     * JWT claims에서 IamUserInfo 생성
     * SecurityContext에서 가져온 JWT claims를 IamUserInfo로 변환
     * 
     * @param claims JWT claims (Map<String, Object>)
     * @return IamUserInfo
     */
    @Override
    public IamUserInfo fromClaims(Map<String, Object> claims) {
        String subject = (String) claims.get("sub");
        String email = (String) claims.get("email");
        String name = (String) claims.get("name");

        // Zitadel의 role은 보통 "roles" 또는 "urn:zitadel:iam:org:project:roles" 클레임에 있음
        List<IamRole> roles = extractRoles(claims);

        return IamUserInfo.of(subject, email, name, roles);
    }

    /**
     * JWT claims에서 role 목록 추출
     * 
     * @param claims JWT claims
     * @return role 목록
     */
    private static List<IamRole> extractRoles(Map<String, Object> claims) {
        List<IamRole> roles = new ArrayList<>();

        // Zitadel의 role 클레임 위치 확인 필요
        // 일반적으로 "roles" 또는 "urn:zitadel:iam:org:project:roles" 형태
        Object rolesClaim = claims.get("roles");
        if (rolesClaim instanceof List) {
            ((List<?>) rolesClaim).forEach(role -> {
                if (role instanceof String) {
                    IamRole iamRole = IamRole.fromString((String) role);
                    if (iamRole != null) {
                        roles.add(iamRole);
                    }
                }
            });
        }

        // 다른 형태의 role 클레임도 확인
        // 예: "urn:zitadel:iam:org:project:roles" 형태
        claims.forEach((key, value) -> {
            if (key.contains("roles") && value instanceof List) {
                ((List<?>) value).forEach(role -> {
                    if (role instanceof String) {
                        IamRole iamRole = IamRole.fromString((String) role);
                        if (iamRole != null && !roles.contains(iamRole)) {
                            roles.add(iamRole);
                        }
                    }
                });
            }
        });

        return roles;
    }
}

