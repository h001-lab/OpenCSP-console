package io.hlab.opencsp.infrastructure.iam.zitadel;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.util.StringUtils;

/**
 * ConfigStore(DB → env 폴백)에서 Zitadel OAuth2 클라이언트 설정을 읽는다.
 * findByRegistrationId() 호출 시마다 최신 설정을 반영한다.
 */
@Slf4j
@RequiredArgsConstructor
class DynamicClientRegistrationRepository implements ClientRegistrationRepository {

    private final ConfigStore configStore;

    @Override
    public ClientRegistration findByRegistrationId(String registrationId) {
        if (!"zitadel".equals(registrationId)) return null;

        String issuerUri = configStore.get(ConfigCategory.IAM, "zitadel.issuer-uri", "");
        String clientId  = configStore.get(ConfigCategory.IAM, "zitadel.client-id", "");
        String clientSecret = configStore.get(ConfigCategory.IAM, "zitadel.client-secret", "");

        if (!StringUtils.hasText(clientId)) {
            log.warn("IAM[zitadel]: client-id not configured. OAuth2 browser login is disabled.");
            return null;
        }

        String base = issuerUri.endsWith("/") ? issuerUri.substring(0, issuerUri.length() - 1) : issuerUri;
        return ClientRegistration.withRegistrationId("zitadel")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/zitadel")
                .scope("openid", "profile", "email",
                        "urn:zitadel:iam:org:project:role:admin",
                        "urn:zitadel:iam:org:project:role:userA",
                        "urn:zitadel:iam:org:project:role:userB",
                        "urn:zitadel:iam:org:project:role:userC")
                .authorizationUri(base + "/oauth/v2/authorize")
                .tokenUri(base + "/oauth/v2/token")
                .userInfoUri(base + "/oidc/v1/userinfo")
                .userNameAttributeName("sub")
                .jwkSetUri(base + "/oauth/v3/keys")
                .issuerUri(issuerUri)
                .clientName("ZITADEL")
                .build();
    }
}
