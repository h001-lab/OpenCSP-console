package io.hlab.opencsp.api.admin.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.hlab.opencsp.domain.user.User;
import io.hlab.opencsp.infrastructure.iam.IamUserInfo;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminUserResponse(
        String id,
        String email,
        String name,
        List<String> roles,
        String status,
        LocalDateTime syncedAt,
        LocalDateTime createdAt
) {
    public static AdminUserResponse from(IamUserInfo user) {
        List<String> roleValues = user.getRoles().stream()
                .map(r -> r.getValue())
                .toList();
        return new AdminUserResponse(user.getSubject(), user.getEmail(), user.getName(), roleValues, null, null, null);
    }

    public static AdminUserResponse from(User user) {
        List<String> roleList = (user.getRoles() != null && !user.getRoles().isBlank())
                ? Arrays.asList(user.getRoles().split(","))
                : List.of();
        return new AdminUserResponse(
                user.getIamSubject(),
                user.getEmail(),
                user.getName(),
                roleList,
                user.getIamStatus(),
                user.getSyncedAt(),
                user.getCreatedAt()
        );
    }
}
