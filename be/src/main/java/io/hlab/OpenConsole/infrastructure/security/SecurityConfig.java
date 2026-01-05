package io.hlab.OpenConsole.infrastructure.security;

import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // @PreAuthorize 사용을 위해 필요
@RequiredArgsConstructor
public class SecurityConfig {

    private final JITUserProvisioningHandler jitUserProvisioningHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 세션을 사용하지 않고 JWT만 사용
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // CSRF 비활성화 (JWT 사용 시 불필요)
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Swagger UI 및 API 문서는 허용 (테스트용)
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                // OAuth2 로그인 엔드포인트는 허용
                .requestMatchers("/login/**", "/oauth2/**").permitAll()
                // 나머지 모든 요청은 인증 필요
                .anyRequest().authenticated()
            )
            // OAuth2 Client: 로그인 플로우 (FE에서 리다이렉트)
            .oauth2Login(oauth2 -> oauth2
                .successHandler(jitUserProvisioningHandler) // 로그인 성공 시 우리 DB에 저장 및 role 부여
            )
            // OAuth2 Resource Server: JWT 토큰 검증 (API 요청 시)
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtToken -> {
                        // JWT에서 role을 추출하여 GrantedAuthority로 변환
                        Collection<GrantedAuthority> authorities = extractAuthorities(jwtToken);
                        return new JwtAuthenticationToken(jwtToken, authorities);
                    })
                    // JWT 검증은 application.yaml의 설정을 사용
                    // issuer-uri를 통해 JWKS 엔드포인트 자동 감지
                )
            );
        
        return http.build();
    }

    /**
     * JWT에서 role을 추출하여 GrantedAuthority로 변환
     * Spring Security의 @PreAuthorize에서 hasRole() 사용을 위해 필요
     */
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        // 기본 scope 권한 추가
        JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();
        Collection<GrantedAuthority> authorities = new ArrayList<>(defaultConverter.convert(jwt));
        
        // JWT claims에서 role 추출
        Map<String, Object> claims = jwt.getClaims();
        List<IamRole> roles = extractRoles(claims);
        
        // IamRole을 GrantedAuthority로 변환
        // Spring Security는 "ROLE_" prefix를 사용
        roles.forEach(role -> {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        });
        
        return authorities;
    }

    /**
     * JWT claims에서 role 목록 추출
     * 
     * Zitadel의 role 클레임은 다음과 같은 형태로 나타날 수 있습니다:
     * 1. 배열 형태: ["admin", "userA"]
     * 2. 객체 형태: {"user": {"351864415584321539": "idp.avgmax.team"}}
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
}
