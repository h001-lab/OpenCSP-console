package io.hlab.opencsp.infrastructure.teleport;

import lombok.Builder;
import lombok.Getter;

/** Teleport 클러스터에 등록된 노드 정보 */
@Getter
@Builder
public class TeleportNodeInfo {
    /** Teleport 내부 노드 UUID */
    private final String id;
    private final String hostname;
    private final String addr;
    private final String clusterName;
}
