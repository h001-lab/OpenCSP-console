package io.hlab.opencsp.domain.config;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppConfigRepository extends JpaRepository<AppConfig, Long> {

    Optional<AppConfig> findByCategoryAndKey(ConfigCategory category, String key);

    List<AppConfig> findAllByCategory(ConfigCategory category);

    void deleteByCategoryAndKey(ConfigCategory category, String key);
}
