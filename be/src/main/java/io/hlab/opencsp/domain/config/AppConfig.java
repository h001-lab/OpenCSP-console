package io.hlab.opencsp.domain.config;

import io.hlab.opencsp.infrastructure.config.EncryptedStringConverter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * DB 기반 애플리케이션 설정 엔티티.
 * <p>
 * - sensitive=true 인 값은 저장 전 AES 암호화되며, 응답 시 마스킹된다.
 * - 환경 변수보다 우선 적용된다 (DB 우선, env fallback).
 * - 변경 이력: updatedAt + updatedBy 필드로 추적.
 */
@Getter
@Entity
@Table(
    name = "app_config",
    uniqueConstraints = @UniqueConstraint(columnNames = {"category", "config_key"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID. null = 글로벌 설정(모든 테넌트 공유) */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConfigCategory category;

    @Column(name = "config_key", nullable = false, length = 120)
    private String key;

    /** sensitive=true 이면 AES 암호화 저장 */
    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String value;

    /** true 이면 API 응답 시 값을 마스킹 */
    @Column(nullable = false)
    private boolean sensitive;

    /** 설정 설명 (UI에 표시) */
    @Column(length = 512)
    private String description;

    @Column(length = 120)
    private String updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public AppConfig(ConfigCategory category, String key, String value,
                     boolean sensitive, String description, String updatedBy) {
        this.category = category;
        this.key = key;
        this.value = value;
        this.sensitive = sensitive;
        this.description = description;
        this.updatedBy = updatedBy;
    }

    public void update(String value, String updatedBy) {
        this.value = value;
        this.updatedBy = updatedBy;
    }

    public void updateDescription(String description) {
        this.description = description;
    }
}
