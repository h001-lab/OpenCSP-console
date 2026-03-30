package io.hlab.opencsp.domain.news;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "news")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class News {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    /** 카테고리 (예: 공지, 업데이트, 점검) */
    @Column(length = 50)
    private String category;

    /** 홈 화면 노출 여부 */
    @Column(nullable = false)
    private boolean published;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public static News create(String title, String content, String category, boolean published) {
        return News.builder()
                .title(title)
                .content(content)
                .category(category)
                .published(published)
                .build();
    }

    public void update(String title, String content, String category, boolean published) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.published = published;
        this.updatedAt = LocalDateTime.now();
    }
}
