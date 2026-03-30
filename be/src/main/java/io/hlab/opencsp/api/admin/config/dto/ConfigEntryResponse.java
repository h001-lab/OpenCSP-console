package io.hlab.opencsp.api.admin.config.dto;

import io.hlab.opencsp.domain.config.AppConfig;
import io.hlab.opencsp.domain.config.ConfigCategory;
import java.time.LocalDateTime;

public record ConfigEntryResponse(
        ConfigCategory category,
        String key,
        String value,   // sensitive=true이면 "****" 마스킹
        boolean sensitive,
        String description,
        String updatedBy,
        LocalDateTime updatedAt
) {
    private static final String MASKED = "****";

    public static ConfigEntryResponse from(AppConfig config) {
        return new ConfigEntryResponse(
                config.getCategory(),
                config.getKey(),
                config.isSensitive() ? MASKED : config.getValue(),
                config.isSensitive(),
                config.getDescription(),
                config.getUpdatedBy(),
                config.getUpdatedAt()
        );
    }
}
