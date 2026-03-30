package io.hlab.opencsp.api.user.dto;

import io.hlab.opencsp.domain.user.User;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public record UserResponse(
        Long id,
        String email,
        String name,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Map<String, String> links
) {
    public static UserResponse from(User user, String baseUrl, String resourcePath) {
        Map<String, String> links = new HashMap<>();
        String resourceUrl = baseUrl + resourcePath;
        Long userId = user.getId();
        links.put("self",   resourceUrl + "/" + userId);
        links.put("update", resourceUrl + "/" + userId);
        links.put("delete", resourceUrl + "/" + userId);
        links.put("list",   resourceUrl);
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                links
        );
    }
}
