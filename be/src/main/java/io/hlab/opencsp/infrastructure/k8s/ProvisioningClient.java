package io.hlab.opencsp.infrastructure.k8s;

import java.util.List;
import java.util.Map;

/**
 * k8s 기반 프로비저닝 클라이언트 추상화.
 * <p>
 * - app.k8s.enabled=true  → TofuControllerProvisioningClient (FluxCD + tofu-controller)
 * - app.k8s.enabled=false → NoOpProvisioningClient (개발/데모용)
 */
public interface ProvisioningClient {

    /**
     * Terraform CR을 생성하여 프로비저닝을 시작한다.
     *
     * @param request 생성할 CR 정보 (모듈 타입, 사용자 값, 네임스페이스 등)
     * @return 생성된 CR 이름 (이후 상태 조회 시 사용)
     */
    String provision(ProvisionRequest request);

    /**
     * 생성된 Terraform CR 및 관련 리소스를 삭제(destroy)한다.
     *
     * @param crName CR 이름 (provision() 반환값)
     */
    void destroy(String crName);

    /**
     * Terraform CR의 현재 상태를 반환한다.
     *
     * @param crName CR 이름
     * @return 상태 맵 (tofu-controller가 설정하는 status 필드)
     */
    Map<String, Object> getStatus(String crName);

    /**
     * 네임스페이스 내 모든 Terraform CR의 상태를 반환한다.
     *
     * @return crName → status 맵
     */
    Map<String, Map<String, Object>> listAllStatus(String namespace);

    /**
     * Terraform CR의 finalizer를 강제로 제거하고 삭제한다.
     * tofu-controller가 terraform destroy를 완료하지 못해 CR이 stuck된 경우에 사용한다.
     *
     * @param crName CR 이름
     */
    void forceDelete(String crName);

    /**
     * Terraform apply 완료 후 CR의 {@code status.outputs}를 읽어 반환한다.
     *
     * <p>tofu-controller는 apply 완료 시 outputs를 아래 형식으로 CR status에 저장한다:
     * <pre>
     * status:
     *   outputs:
     *     vm_ip:
     *       value: "192.168.1.100"
     *       type: "string"
     *       sensitive: false
     * </pre>
     *
     * @param crName CR 이름
     * @return output 키 → OutputEntry (값, 타입, sensitive 여부)
     */
    Map<String, OutputEntry> getOutputs(String crName);

    /**
     * 네임스페이스 내 모든 Terraform CR의 메타데이터를 반환한다.
     * DB 재구성(클러스터 동기화) 용도.
     *
     * @return CR 메타 목록 (이름, 라벨에서 추출한 userId/moduleType, spec의 gitRepositoryName, 현재 status)
     */
    List<CrMeta> listAllCrMeta(String namespace);

    /** Terraform output 항목 */
    record OutputEntry(String value, String type, boolean sensitive) {}

    /** 클러스터 동기화용 CR 메타 */
    record CrMeta(String crName, String userId, String moduleType, String gitRepositoryName,
                  java.util.Map<String, Object> statusMap) {}
}
