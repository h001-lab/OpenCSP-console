package io.hlab.opencsp.infrastructure.persistence.news;

import io.hlab.opencsp.domain.news.News;
import io.hlab.opencsp.domain.news.NewsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class NewsJpaRepository implements NewsRepository {

    private final SpringDataNewsRepository delegate;

    @Override public List<News> findAll()                      { return delegate.findAll(); }
    @Override public List<News> findByPublishedTrue()                          { return delegate.findByPublishedTrue(); }
    @Override public List<News> findByPublishedTrueOrderByCreatedAtDesc()     { return delegate.findByPublishedTrueOrderByCreatedAtDesc(); }
    @Override public Optional<News> findById(Long id)          { return delegate.findById(id); }
    @Override public News save(News news)                      { return delegate.save(news); }
    @Override public void deleteById(Long id)                  { delegate.deleteById(id); }
}
