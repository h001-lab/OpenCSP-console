package io.hlab.opencsp.infrastructure.persistence.news;

import io.hlab.opencsp.domain.news.News;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface SpringDataNewsRepository extends JpaRepository<News, Long> {
    List<News> findByPublishedTrue();
    List<News> findByPublishedTrueOrderByCreatedAtDesc();
}
