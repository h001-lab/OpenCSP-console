package io.hlab.opencsp.api.admin.news.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NewsRequest {
    @NotBlank
    private String title;
    private String content;
    private String category;
    private boolean published = true;
}
