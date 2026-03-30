package io.hlab.opencsp.infrastructure.config;

import io.hlab.opencsp.domain.config.AppConfig;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.domain.news.News;
import io.hlab.opencsp.domain.news.NewsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 앱 최초 실행 시 DB에 기본 설정값을 삽입한다.
 * DB에 이미 해당 key가 있으면 건너뛴다 (env 값은 무시하고 DB 존재 여부만 판단).
 */
@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class DefaultConfigSeeder implements ApplicationRunner {

    private final ConfigStore configStore;
    private final NewsRepository newsRepository;

    @Override
    public void run(ApplicationArguments args) {
        Set<String> existingGeneralKeys    = toKeySet(configStore.getAll(ConfigCategory.GENERAL));
        Set<String> existingIamKeys        = toKeySet(configStore.getAll(ConfigCategory.IAM));
        Set<String> existingProvisionKeys  = toKeySet(configStore.getAll(ConfigCategory.PROVISION));

        // DB에 없는 키만 씨드하되, 기본값은 환경변수에서 읽어온다.
        // 이미 DB에 값이 있으면 스킵 → UI에서 수정한 값이 항상 우선된다.
        seedIfAbsent(existingGeneralKeys, ConfigCategory.GENERAL, "iam.provider", "none", false,
                "IAM 공급자 (none | zitadel)");

        seedIfAbsent(existingIamKeys, ConfigCategory.IAM, "zitadel.issuer-uri", "", false,
                "Zitadel 발급 URL (예: https://your-instance.zitadel.cloud)");
        seedIfAbsent(existingIamKeys, ConfigCategory.IAM, "zitadel.client-id", "", false,
                "Zitadel OAuth2 Client ID");
        seedIfAbsent(existingIamKeys, ConfigCategory.IAM, "zitadel.client-secret", "", true,
                "Zitadel OAuth2 Client Secret");
        seedIfAbsent(existingIamKeys, ConfigCategory.IAM, "zitadel.org-id", "", false,
                "Zitadel 조직 ID");
        seedIfAbsent(existingIamKeys, ConfigCategory.IAM, "zitadel.project-id", "", false,
                "Zitadel 프로젝트 ID");
        seedIfAbsent(existingIamKeys, ConfigCategory.IAM, "zitadel.service-token", "", true,
                "Zitadel Management API 서비스 계정 토큰");

        seedIfAbsent(existingGeneralKeys, ConfigCategory.GENERAL, "banner.message", "", false,
                "배너 메시지 텍스트");
        seedIfAbsent(existingGeneralKeys, ConfigCategory.GENERAL, "banner.link", "", false,
                "배너 링크 URL");

        seedIfAbsent(existingProvisionKeys, ConfigCategory.PROVISION, "history-retention-days", "90", false,
                "프로비저닝 이력 보관 일수 (0 = 자동 삭제 비활성화)");

        log.info("DefaultConfigSeeder: default config seeding complete.");

        seedDefaultNews();
    }

    private void seedDefaultNews() {
        if (!newsRepository.findAll().isEmpty()) return;

        List<News> samples = List.of(
            News.create("OpenCSP v0.2.0 Released",
                "Proxmox provisioning improvements, Zitadel IAM integration, and WebSocket-based console access are now available.",
                "업데이트", true),
            News.create("Kubernetes Integration Now Available",
                "Deploy and manage Kubernetes clusters directly from the OpenCSP console using the new Integrations panel.",
                "업데이트", true),
            News.create("Scheduled Maintenance Notice",
                "The platform will undergo scheduled maintenance. All provisioned instances will remain unaffected.",
                "점검", true)
        );
        samples.forEach(newsRepository::save);
        log.info("DefaultConfigSeeder: {} default news items inserted.", samples.size());
    }

    private void seedIfAbsent(Set<String> existingKeys, ConfigCategory category, String key,
                               String fallback, boolean sensitive, String description) {
        if (!existingKeys.contains(key)) {
            // DB에 없을 때만 씨드. 환경변수에 값이 있으면 그걸 쓰고, 없으면 fallback 사용.
            // configStore.get()은 DB → env 순서로 조회하는데, DB가 비어있으므로 env 값을 반환한다.
            String value = configStore.get(category, key, fallback);
            configStore.set(category, key, value, sensitive, description, "system");
            log.debug("DefaultConfigSeeder: seeded {}/{} (from {})",
                    category, key, sensitive ? "***" : value);
        }
    }

    private Set<String> toKeySet(List<AppConfig> configs) {
        return configs.stream().map(AppConfig::getKey).collect(Collectors.toSet());
    }
}
