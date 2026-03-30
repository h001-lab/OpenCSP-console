package io.hlab.opencsp.common.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class RequestUtils {

    private RequestUtils() {}

    public static String getBaseUrl(HttpServletRequest request) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String contextPath = request.getContextPath();

        StringBuilder url = new StringBuilder();
        url.append(scheme).append("://").append(serverName);

        if ((scheme.equals("http") && serverPort != 80) ||
            (scheme.equals("https") && serverPort != 443)) {
            url.append(":").append(serverPort);
        }

        url.append(contextPath);
        return url.toString();
    }

    private static final Pattern JWT_SUB = Pattern.compile("\"sub\"\\s*:\\s*\"([^\"]+)\"");

    /**
     * Authorization: Bearer 헤더에서 JWT payload를 base64 디코딩하여 sub 클레임을 추출한다.
     * 서명 검증 없이 클레임만 읽으므로 IAM이 비활성화된(none) 모드에서 사용자 식별용으로만 사용한다.
     */
    public static Optional<String> extractJwtSubject(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return Optional.empty();
        try {
            String[] parts = auth.substring(7).split("\\.");
            if (parts.length < 2) return Optional.empty();
            // URL-safe base64 → standard, 패딩 보정
            String padded = parts[1].replace('-', '+').replace('_', '/');
            int rem = padded.length() % 4;
            if (rem == 2) padded += "==";
            else if (rem == 3) padded += "=";
            String payload = new String(Base64.getDecoder().decode(padded));
            Matcher m = JWT_SUB.matcher(payload);
            return m.find() ? Optional.of(m.group(1)) : Optional.empty();
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public static String getResourcePath(HttpServletRequest request) {
        String requestURI = request.getRequestURI();
        String contextPath = request.getContextPath();

        String path = requestURI;
        if (contextPath != null && !contextPath.isEmpty()) {
            path = requestURI.substring(contextPath.length());
        }

        int lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex > 0) {
            String potentialId = path.substring(lastSlashIndex + 1);
            try {
                Long.parseLong(potentialId);
                path = path.substring(0, lastSlashIndex);
            } catch (NumberFormatException e) {
                // ID가 아니면 그대로 유지
            }
        }

        return path;
    }
}
