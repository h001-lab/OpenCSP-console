package io.hlab.opencsp.infrastructure.config;

import io.hlab.opencsp.domain.config.AppConfig;
import io.hlab.opencsp.domain.config.AppConfigRepository;
import io.hlab.opencsp.domain.config.ConfigCategory;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * DB 우선 조회, 없으면 Spring Environment(env/yaml) fallback.
 * <p>
 * 환경변수 매핑 규칙:
 *   ConfigCategory.IAM  + "zitadel.issuer-uri"  →  ZITADEL_ISSUER_URI  또는  zitadel.issuer-uri
 *   ConfigCategory.K8S  + "enabled"              →  APP_K8S_ENABLED      또는  app.k8s.enabled
 *   ConfigCategory.AI   + "openai.api-key"       →  SPRING_AI_OPENAI_API_KEY
 * <p>
 * 카테고리별 env 키 접두사:
 *   IAM    → zitadel.* / teleport.*
 *   K8S    → app.k8s.*
 *   AI     → spring.ai.*
 *   GENERAL → app.*
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DbEnvConfigStore implements ConfigStore {

    private final AppConfigRepository repository;
    private final Environment env;

    @Override
    public Optional<String> get(ConfigCategory category, String key) {
        Optional<String> dbValue = repository.findByCategoryAndKey(category, key)
                .map(AppConfig::getValue);
        if (dbValue.isPresent()) {
            log.atDebug()
                    .addKeyValue("category", category)
                    .addKeyValue("config_key", key)
                    .addKeyValue("env_source", "db")
                    .log("Config lookup: DB hit");
            return dbValue;
        }
        return lookupEnv(category, key);
    }

    @Override
    public String get(ConfigCategory category, String key, String defaultValue) {
        return get(category, key).orElse(defaultValue);
    }

    @Override
    @Transactional
    public AppConfig set(ConfigCategory category, String key, String value,
                         boolean sensitive, String description, String updatedBy) {
        AppConfig config = repository.findByCategoryAndKey(category, key)
                .orElseGet(() -> AppConfig.builder()
                        .category(category)
                        .key(key)
                        .sensitive(sensitive)
                        .description(description)
                        .updatedBy(updatedBy)
                        .value(value)
                        .build());

        if (config.getId() != null) {
            config.update(value, updatedBy);
            if (description != null) config.updateDescription(description);
        }

        AppConfig saved = repository.save(config);
        log.info("Config saved: category={}, key={}, updatedBy={}", category, key, updatedBy);
        return saved;
    }

    @Override
    @Transactional
    public void delete(ConfigCategory category, String key) {
        repository.deleteByCategoryAndKey(category, key);
        log.info("Config deleted: category={}, key={}", category, key);
    }

    @Override
    public List<AppConfig> getAll(ConfigCategory category) {
        return repository.findAllByCategory(category);
    }

    @Override
    public Map<ConfigCategory, List<AppConfig>> getAll() {
        Map<ConfigCategory, List<AppConfig>> result = new EnumMap<>(ConfigCategory.class);
        Arrays.stream(ConfigCategory.values())
                .forEach(cat -> result.put(cat, repository.findAllByCategory(cat)));
        return result;
    }

    // -------------------------------------------------------------------------
    // env fallback
    // -------------------------------------------------------------------------

    /**
     * 카테고리 + key를 Spring Environment 속성 키로 변환하여 조회.
     * 예: K8S + "enabled" → app.k8s.enabled
     *     IAM + "zitadel.issuer-uri" → zitadel.issuer-uri
     */
    private Optional<String> lookupEnv(ConfigCategory category, String key) {
        String envKey = toEnvKey(category, key);
        String value = env.getProperty(envKey);
        if (value != null) {
            log.debug("Config fallback to env: category={}, key={}, envKey={}", category, key, envKey);
        }
        return Optional.ofNullable(value);
    }

    private String toEnvKey(ConfigCategory category, String key) {
        return switch (category) {
            case IAM       -> key;                      // e.g. zitadel.issuer-uri
            case K8S       -> "app.k8s." + key;         // e.g. app.k8s.enabled
            case AI        -> "spring.ai." + key;       // e.g. spring.ai.openai.api-key
            case SEMAPHORE -> key;
            case PROVISION -> "app.provision." + key;   // e.g. app.provision.history-retention-days
            case BILLING   -> "billing." + key;          // e.g. billing.lago.url
            case GENERAL   -> "app." + key;
        };
    }
}
