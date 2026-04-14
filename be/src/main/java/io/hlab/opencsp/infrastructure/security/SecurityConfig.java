package io.hlab.opencsp.infrastructure.security;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import io.hlab.opencsp.infrastructure.iam.IamRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.lang.NonNull;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private ConfigStore configStore;

    @Autowired(required = false)
    private JwtDecoder jwtDecoder;

    @Autowired(required = false)
    private JITUserProvisioningHandler jitUserProvisioningHandler;

    @Autowired(required = false)
    private ApplicationContext applicationContext;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .csrf(csrf -> csrf.disable())
            // none 모드일 때 admin 권한 주입 (JWT 필터보다 먼저 실행)
            .addFilterBefore(new NoIamAuthFilter(configStore), BasicAuthenticationFilter.class)
            // MDC iam_session_id 설정 (BearerTokenAuthenticationFilter 이후 — SecurityContext 채워진 뒤)
            .addFilterAfter(new MdcContextFilter(), BearerTokenAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/login/**", "/oauth2/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                // WebSocket 핸드셰이크: sessionId 기반 자체 검증 (ConsoleWebSocketHandler)
                .requestMatchers("/api/console/ws/**").permitAll()
                // iam.provider를 요청마다 동적으로 확인
                .anyRequest().access((authSupplier, context) -> {
                    String provider = configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");
                    if (!"zitadel".equals(provider)) {
                        return new AuthorizationDecision(true);
                    }
                    Authentication authentication = authSupplier.get();
                    boolean authenticated = authentication != null
                        && authentication.isAuthenticated()
                        && !(authentication instanceof AnonymousAuthenticationToken);
                    return new AuthorizationDecision(authenticated);
                })
            );

        configureOAuth2Login(http);
        configureJwtResourceServer(http);

        log.info("Security filter chain built. IAM provider will be resolved per-request from ConfigStore.");
        return http.build();
    }

    /**
     * OAuth2 브라우저 로그인 설정.
     * ClientRegistrationRepository와 JITUserProvisioningHandler가 모두 있을 때만 활성화된다.
     */
    private void configureOAuth2Login(HttpSecurity http) throws Exception {
        if (applicationContext == null || jitUserProvisioningHandler == null) return;
        try {
            ClientRegistrationRepository crr = applicationContext.getBean(ClientRegistrationRepository.class);
            if (crr != null && crr.findByRegistrationId("zitadel") != null) {
                http.oauth2Login(oauth2 -> oauth2
                    .successHandler(jitUserProvisioningHandler)
                );
                log.info("IAM[zitadel]: OAuth2 browser login enabled.");
            }
        } catch (org.springframework.beans.factory.NoSuchBeanDefinitionException e) {
            log.debug("ClientRegistrationRepository not found, skipping OAuth2 Login configuration");
        }
    }

    /**
     * JWT Resource Server 설정.
     * ZitadelIamConfig에서 등록한 JwtDecoder 빈을 사용한다.
     * DynamicBearerTokenResolver를 통해 none 모드에서는 JWT 디코딩을 건너뛴다.
     * 인증 실패 시 JSON 형태로 응답한다.
     */
    private void configureJwtResourceServer(HttpSecurity http) throws Exception {
        http.oauth2ResourceServer(oauth2 -> oauth2
            .bearerTokenResolver(new DynamicBearerTokenResolver(configStore))
            .authenticationEntryPoint((request, response, ex) ->
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", ex.getMessage()))
            .accessDeniedHandler((request, response, ex) ->
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden", ex.getMessage()))
            .jwt(jwt -> {
                if (jwtDecoder != null) {
                    jwt.decoder(jwtDecoder);
                }
                jwt.jwtAuthenticationConverter(jwtToken -> {
                    Collection<GrantedAuthority> authorities = extractAuthorities(jwtToken);
                    return new JwtAuthenticationToken(jwtToken, authorities);
                });
            })
        );
        log.info("IAM[zitadel]: JWT resource server enabled (dynamic).");
    }

    private void writeJsonError(HttpServletResponse response, int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        String safeMessage = message != null ? message.replace("\"", "'") : "";
        response.getWriter().write("{\"error\":\"" + error + "\",\"message\":\"" + safeMessage + "\"}");
    }

    /**
     * none 모드일 때 모든 요청에 admin 권한을 주입하는 필터.
     * BearerTokenAuthenticationFilter보다 먼저 실행되어 SecurityContext를 채운다.
     */
    private static class NoIamAuthFilter extends OncePerRequestFilter {
        private final ConfigStore configStore;

        NoIamAuthFilter(ConfigStore configStore) {
            this.configStore = configStore;
        }

        @Override
        protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                        @NonNull FilterChain chain) throws ServletException, IOException {
            String provider = configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");
            if (!"zitadel".equals(provider)) {
                List<GrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + IamRole.ADMIN.name()),
                    new SimpleGrantedAuthority("ROLE_" + IamRole.USER_A.name())
                );
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("anonymous", null, authorities)
                );
            }
            chain.doFilter(request, response);
        }
    }

    /**
     * iam.provider가 zitadel이 아닐 때는 Bearer 토큰을 무시한다.
     * none 모드에서 issuer-uri 미설정으로 인한 JWT 디코딩 오류를 방지한다.
     */
    private static class DynamicBearerTokenResolver implements BearerTokenResolver {
        private final ConfigStore configStore;
        private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

        DynamicBearerTokenResolver(ConfigStore configStore) {
            this.configStore = configStore;
        }

        @Override
        public String resolve(HttpServletRequest request) {
            String provider = configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");
            return "zitadel".equals(provider) ? delegate.resolve(request) : null;
        }
    }

    /**
     * JWT에서 role을 추출하여 GrantedAuthority로 변환
     */
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();
        Collection<GrantedAuthority> authorities = new ArrayList<>(defaultConverter.convert(jwt));

        Map<String, Object> claims = jwt.getClaims();
        List<IamRole> roles = extractRoles(claims);

        roles.forEach(role ->
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );

        return authorities;
    }

    /**
     * JWT claims에서 role 목록 추출.
     *
     * Zitadel의 role 클레임은 다음과 같은 형태로 나타날 수 있다:
     * 1. 배열 형태: ["admin", "userA"]
     * 2. 객체 형태: {"user": {"351864415584321539": "idp.avgmax.team"}}
     */
    @SuppressWarnings("unchecked")
    private List<IamRole> extractRoles(Map<String, Object> claims) {
        List<IamRole> roles = new ArrayList<>();

        log.debug("JWT Claims: {}", claims);

        // 1. "roles" 클레임 (배열 형태)
        Object rolesClaim = claims.get("roles");
        if (rolesClaim instanceof List) {
            log.debug("Found 'roles' claim (List): {}", rolesClaim);
            ((List<?>) rolesClaim).forEach(role -> {
                if (role instanceof String) {
                    IamRole iamRole = IamRole.fromString((String) role);
                    if (iamRole != null) roles.add(iamRole);
                    else log.warn("Unknown role value in 'roles' claim: {}", role);
                }
            });
        }

        // 2. "urn:zitadel:iam:...:roles" 형태의 클레임 (배열 또는 객체)
        claims.forEach((key, value) -> {
            if (!key.equals("roles") && key.contains("roles")) {
                log.debug("Found role claim key='{}': {}", key, value);

                if (value instanceof List) {
                    ((List<?>) value).forEach(role -> {
                        if (role instanceof String) {
                            IamRole iamRole = IamRole.fromString((String) role);
                            if (iamRole != null && !roles.contains(iamRole)) roles.add(iamRole);
                        }
                    });
                } else if (value instanceof Map) {
                    ((Map<String, Object>) value).forEach((roleName, roleValue) -> {
                        IamRole iamRole = IamRole.fromString(roleName);
                        if (iamRole != null && !roles.contains(iamRole)) roles.add(iamRole);
                        else if (iamRole == null) log.warn("Unknown role name in '{}' claim: {}", key, roleName);
                    });
                }
            }
        });

        log.debug("Extracted roles from JWT: {}", roles);
        return roles;
    }
}
