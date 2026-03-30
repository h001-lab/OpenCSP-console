package io.hlab.opencsp.domain.news;

import java.util.List;
import java.util.Optional;

public interface NewsRepository {
    List<News> findAll();
    List<News> findByPublishedTrue();
    List<News> findByPublishedTrueOrderByCreatedAtDesc();
    Optional<News> findById(Long id);
    News save(News news);
    void deleteById(Long id);
}
