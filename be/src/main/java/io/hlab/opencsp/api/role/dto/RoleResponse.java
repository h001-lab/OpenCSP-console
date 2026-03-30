package io.hlab.opencsp.api.role.dto;

import io.hlab.opencsp.infrastructure.iam.IamRole;
import java.util.List;

public record RoleResponse(
        String email,
        List<IamRole> roles
) {
    public static RoleResponse of(String email, List<IamRole> roles) {
        return new RoleResponse(email, roles);
    }
}
