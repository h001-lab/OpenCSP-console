package io.hlab.opencsp.infrastructure.k8s;

import java.util.Map;
import lombok.Builder;
import lombok.Getter;

/**
 * Terraform CR 생성에 필요한 파라미터.
 * <p>
 * - moduleType : 사용할 Terraform 모듈 종류 (e.g. "proxmox-vm", "proxmox-network")
 * - modulePath : GitRepository 내 모듈 경로 (e.g. "./modules/proxmox-vm")
 * - gitRepositoryName : k3s에 이미 존재하는 GitRepository CR 이름
 * - userId : 소유자 식별자 (CR 라벨에 기록)
 * - crName : 생성할 Terraform CR 이름 (중복 방지는 서비스 레이어 책임)
 * - vars : Terraform 모듈에 전달할 입력 변수 (key=변수명, value=문자열 값)
 */
@Getter
@Builder
public class ProvisionRequest {
    private final String moduleType;
    private final String modulePath;
    private final String gitRepositoryName;
    private final String userId;
    private final String crName;
    private final Map<String, Object> vars;
}
