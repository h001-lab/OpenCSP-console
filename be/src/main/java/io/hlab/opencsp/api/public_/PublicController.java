package io.hlab.opencsp.api.public_;

import io.hlab.opencsp.api.admin.news.dto.NewsResponse;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.domain.news.NewsRepository;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 인증 없이 접근 가능한 공개 엔드포인트.
 * SecurityConfig에서 /api/public/** 를 permitAll()로 허용한다.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final ConfigStore configStore;
    private final NewsRepository newsRepository;

    /**
     * 현재 IAM 설정 상태를 반환한다.
     */
    @GetMapping("/status")
    public Map<String, String> status() {
        String iamProvider = configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");
        return Map.of("iamProvider", iamProvider);
    }

    /**
     * 현재 활성 배너 정보를 반환한다. 클라이언트 polling용.
     */
    @GetMapping("/banner")
    public Map<String, Object> banner() {
        String message = configStore.get(ConfigCategory.GENERAL, "banner.message", "");
        String link    = configStore.get(ConfigCategory.GENERAL, "banner.link",    "");
        return Map.of(
                "message", message,
                "link",    link
        );
    }

    /**
     * 공개된(published=true) 뉴스 목록을 최신 등록순으로 반환한다.
     */
    @GetMapping("/news")
    public List<NewsResponse> news() {
        return newsRepository.findByPublishedTrueOrderByCreatedAtDesc().stream()
                .map(NewsResponse::from).toList();
    }

    @GetMapping("/news/{id}")
    public ResponseEntity<NewsResponse> newsById(@PathVariable Long id) {
        return newsRepository.findById(id)
                .filter(n -> n.isPublished())
                .map(n -> ResponseEntity.ok(NewsResponse.from(n)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
