package io.hlab.opencsp.infrastructure.config;

import io.hlab.opencsp.domain.config.AppConfig;
import io.hlab.opencsp.domain.config.ConfigCategory;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 애플리케이션 설정 저장소 추상화.
 * <p>
 * DB(AppConfig 테이블) 값이 환경 변수보다 우선 적용된다.
 */
public interface ConfigStore {

    /** 값 조회 (DB 없으면 env 참조) */
    Optional<String> get(ConfigCategory category, String key);

    /** 값 조회 + 기본값 */
    String get(ConfigCategory category, String key, String defaultValue);

    /** 설정 저장/수정 */
    AppConfig set(ConfigCategory category, String key, String value,
                  boolean sensitive, String description, String updatedBy);

    /** 설정 삭제 (env fallback으로 복귀) */
    void delete(ConfigCategory category, String key);

    /** 카테고리 전체 조회 */
    List<AppConfig> getAll(ConfigCategory category);

    /** 전체 조회 (카테고리 → 목록 맵) */
    Map<ConfigCategory, List<AppConfig>> getAll();
}
