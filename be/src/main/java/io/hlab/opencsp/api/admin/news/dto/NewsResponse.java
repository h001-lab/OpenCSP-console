package io.hlab.opencsp.api.admin.news.dto;

import io.hlab.opencsp.domain.news.News;
import java.time.LocalDateTime;

public record NewsResponse(
        Long id,
        String title,
        String content,
        String category,
        boolean published,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static NewsResponse from(News n) {
        return new NewsResponse(n.getId(), n.getTitle(), n.getContent(),
                n.getCategory(), n.isPublished(), n.getCreatedAt(), n.getUpdatedAt());
    }
}
