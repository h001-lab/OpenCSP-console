package io.hlab.OpenConsole.api.user.dto;

import io.hlab.OpenConsole.domain.user.User;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Getter
public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Map<String, String> links;

    private UserResponse(Long id, String email, String name, LocalDateTime createdAt, LocalDateTime updatedAt, Map<String, String> links) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.links = links;
    }

    public static UserResponse from(User user, String baseUrl, String resourcePath) {
        Map<String, String> links = new HashMap<>();
        Long userId = user.getId();
        
        String resourceUrl = baseUrl + resourcePath;
        links.put("self", resourceUrl + "/" + userId);
        links.put("update", resourceUrl + "/" + userId);
        links.put("delete", resourceUrl + "/" + userId);
        links.put("list", resourceUrl);
        
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
