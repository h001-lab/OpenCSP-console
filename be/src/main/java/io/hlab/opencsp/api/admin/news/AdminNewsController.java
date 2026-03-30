package io.hlab.opencsp.api.admin.news;

import io.hlab.opencsp.api.admin.news.dto.NewsRequest;
import io.hlab.opencsp.api.admin.news.dto.NewsResponse;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.domain.news.News;
import io.hlab.opencsp.domain.news.NewsRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/news")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - News", description = "뉴스/공지 관리")
public class AdminNewsController {

    private final NewsRepository newsRepository;

    @GetMapping
    @Operation(summary = "뉴스 목록 조회")
    public ApiResponse<List<NewsResponse>> list() {
        return ApiResponse.success(newsRepository.findAll().stream().map(NewsResponse::from).toList());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "뉴스 등록")
    public ApiResponse<NewsResponse> create(@RequestBody @Valid NewsRequest req) {
        News saved = newsRepository.save(News.create(req.getTitle(), req.getContent(), req.getCategory(), req.isPublished()));
        return ApiResponse.success(NewsResponse.from(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "뉴스 수정")
    public ApiResponse<NewsResponse> update(@PathVariable Long id, @RequestBody @Valid NewsRequest req) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "News not found: " + id));
        news.update(req.getTitle(), req.getContent(), req.getCategory(), req.isPublished());
        return ApiResponse.success(NewsResponse.from(newsRepository.save(news)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "뉴스 삭제")
    public void delete(@PathVariable Long id) {
        newsRepository.deleteById(id);
    }
}
