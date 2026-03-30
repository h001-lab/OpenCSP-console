package io.hlab.opencsp.infrastructure.iam.zitadel;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.util.StringUtils;

/**
 * ConfigStore(DB → env 폴백)에서 Zitadel issuer-uri를 읽어 JWT를 검증한다.
 * issuer-uri가 변경되면 디코더를 자동으로 재생성한다.
 */
@Slf4j
@RequiredArgsConstructor
class DynamicZitadelJwtDecoder implements JwtDecoder {

    private final ConfigStore configStore;

    private volatile String cachedIssuerUri;
    private volatile NimbusJwtDecoder cachedDecoder;

    @Override
    public Jwt decode(String token) throws JwtException {
        return getOrCreateDecoder().decode(token);
    }

    private synchronized NimbusJwtDecoder getOrCreateDecoder() {
        String issuerUri = configStore.get(ConfigCategory.IAM, "zitadel.issuer-uri", "");
        if (!StringUtils.hasText(issuerUri)) {
            throw new BadJwtException("Zitadel issuer-uri is not configured. Set it via the admin UI or ZITADEL_ISSUER_URI env var.");
        }
        if (!issuerUri.equals(cachedIssuerUri) || cachedDecoder == null) {
            String base = normalizeBaseUri(issuerUri);
            String jwksUri = base + "/oauth/v2/keys";
            log.info("IAM[zitadel]: (Re)creating JWT decoder. JWKS URI: {}", jwksUri);
            cachedDecoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
            cachedIssuerUri = issuerUri;
        }
        return cachedDecoder;
    }

    private String normalizeBaseUri(String uri) {
        return uri.endsWith("/") ? uri.substring(0, uri.length() - 1) : uri;
    }
}
