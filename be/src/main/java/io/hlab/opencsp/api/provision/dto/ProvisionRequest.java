package io.hlab.opencsp.api.provision.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 프로비저닝 API 요청 DTO.
 * <p>
 * 예시:
 * <pre>
 * POST /api/provisions
 * {
 *   "moduleType": "proxmox-vm",
 *   "gitRepositoryName": "opencsp-modules",
 *   "vars": {
 *     "vm_name": "my-vm",
 *     "vm_cpu": "4",
 *     "vm_memory": "8192",
 *     "proxmox_node": "pve-01"
 *   }
 * }
 * </pre>
 *
 * moduleType은 GitRepository 내 모듈 경로와 1:1 매핑된다.
 * 매핑 테이블은 application.yaml의 app.k8s.flux.module-paths 에 정의한다.
 */
@Getter
@NoArgsConstructor
public class ProvisionRequest {

    @NotBlank
    private String moduleType;

    @NotBlank
    private String gitRepositoryName;

    /** 생성할 Terraform CR 이름. 미입력 시 {moduleType}-{userId}-{timestamp} 로 자동 생성. */
    private String crName;

    @NotEmpty
    private Map<String, Object> vars;
}
