package io.hlab.opencsp.api.admin.node.dto;

import io.hlab.opencsp.domain.node.NodeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NodeRequest {

    @NotBlank
    private String hostname;

    @NotBlank
    private String ip;

    @NotNull
    private NodeType type;

    private String description;
}
