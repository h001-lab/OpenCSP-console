package io.hlab.opencsp.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 모든 HTTP 요청에 MDC {@code iam_session_id}를 설정하는 필터.
 *
 * <ul>
 *   <li>zitadel 모드: JWT {@code jti} 클레임을 {@code iam_session_id}로 사용</li>
 *   <li>none 모드(또는 jti 없음): UUID를 생성해 {@code iam_session_id}로 사용</li>
 * </ul>
 *
 * {@code BearerTokenAuthenticationFilter} 이후에 실행되므로 SecurityContext가 이미 채워진 상태이다.
 * 요청이 끝나면 반드시 MDC를 정리해 다음 요청으로 컨텍스트가 유출되지 않도록 한다.
 */
class MdcContextFilter extends OncePerRequestFilter {

    static final String MDC_SESSION_ID = "iam_session_id";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {
        MDC.put(MDC_SESSION_ID, resolveSessionId());
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_SESSION_ID);
        }
    }

    private String resolveSessionId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            String jti = jwtAuth.getToken().getId();
            if (jti != null && !jti.isBlank()) {
                return jti;
            }
        }
        return UUID.randomUUID().toString();
    }
}
