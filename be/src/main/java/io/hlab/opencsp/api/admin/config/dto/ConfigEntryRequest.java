package io.hlab.opencsp.api.admin.config.dto;

import io.hlab.opencsp.domain.config.ConfigCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ConfigEntryRequest {

    @NotNull
    private ConfigCategory category;

    @NotBlank
    private String key;

    /** null 허용 — 빈 문자열도 저장 가능 (의도적 비우기) */
    private String value;

    private boolean sensitive;

    private String description;
}
