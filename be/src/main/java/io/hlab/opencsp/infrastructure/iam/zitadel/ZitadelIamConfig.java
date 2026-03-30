package io.hlab.opencsp.infrastructure.iam.zitadel;

import io.hlab.opencsp.infrastructure.config.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Zitadel IAM 빈을 항상 등록한다.
 * <p>
 * 실제 활성화 여부는 SecurityConfig가 ConfigStore의 {@code GENERAL/iam.provider} 값으로 결정한다.
 * Zitadel 연결 설정(issuer-uri, client-id 등)은 DB(ConfigStore)에서 읽으며
 * DB에 없으면 환경변수(ZITADEL_*)로 폴백된다.
 * 설정이 UI에서 변경되면 다음 요청부터 자동으로 반영된다.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class ZitadelIamConfig {

    private final ConfigStore configStore;

    /**
     * JWT 검증용 디코더.
     * ConfigStore에서 issuer-uri를 읽어 JWKS URI를 구성한다.
     * issuer-uri가 변경되면 디코더를 자동으로 재생성한다.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        log.info("IAM[zitadel]: JWT decoder configured (DB-backed, dynamic).");
        return new DynamicZitadelJwtDecoder(configStore);
    }

    /**
     * OAuth2 클라이언트 등록 저장소.
     * ConfigStore에서 client-id/secret/issuer-uri를 매 요청마다 읽는다.
     */
    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        log.info("IAM[zitadel]: Client registration repository configured (DB-backed, dynamic).");
        return new DynamicClientRegistrationRepository(configStore);
    }
}
