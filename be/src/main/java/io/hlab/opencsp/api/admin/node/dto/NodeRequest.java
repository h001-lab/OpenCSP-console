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

    // ─── 선택 항목: Proxmox API 크레덴셜 ──────────────────────────────────────
    /** Proxmox API 노드명 (짧은 호스트명). 비어 있으면 hostname 사용. */
    private String proxmoxNode;

    /** Proxmox API 기본 URL (예: https://192.168.1.10:8006) */
    private String apiUrl;

    /** Proxmox API 토큰 (예: root@pam!mytoken=xxxx) */
    private String apiToken;
}
