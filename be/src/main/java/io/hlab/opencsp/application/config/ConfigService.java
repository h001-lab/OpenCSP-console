package io.hlab.opencsp.application.config;

import io.hlab.opencsp.domain.config.AppConfig;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ConfigService {

    private final ConfigStore configStore;

    public Optional<String> get(ConfigCategory category, String key) {
        return configStore.get(category, key);
    }

    public String get(ConfigCategory category, String key, String defaultValue) {
        return configStore.get(category, key, defaultValue);
    }

    public AppConfig save(ConfigCategory category, String key, String value,
                          boolean sensitive, String description, String updatedBy) {
        return configStore.set(category, key, value, sensitive, description, updatedBy);
    }

    public void delete(ConfigCategory category, String key) {
        configStore.delete(category, key);
    }

    public List<AppConfig> getByCategory(ConfigCategory category) {
        return configStore.getAll(category);
    }

    public Map<ConfigCategory, List<AppConfig>> getAll() {
        return configStore.getAll();
    }
}
