package io.hlab.opencsp.infrastructure.semaphore;

import java.util.Map;

/**
 * Ansible Semaphore 연동 추상화.
 *
 * <p>프로비저닝 완료 후 Ansible playbook을 실행하여 post-provisioning 작업(Teleport agent 설치 등)을 자동화한다.
 *
 * <h3>ConfigStore 설정 키 (SEMAPHORE 카테고리)</h3>
 * <pre>
 *   semaphore.url           — Semaphore 서버 주소 (예: https://semaphore.example.com)
 *   semaphore.api.token     — API 토큰 (Semaphore UI: User Settings → API Tokens) [sensitive]
 *   semaphore.project.id    — 프로젝트 ID
 *   semaphore.repository.id — 프로젝트에 등록된 Git Repository ID
 *   semaphore.playbook      — 실행할 playbook 경로 (예: site.yml)
 *   semaphore.environment.id — (선택) 공통 변수 그룹 ID. 미설정 시 프로비저닝마다 동적 생성 후 삭제
 * </pre>
 */
public interface SemaphoreClient {

    /** 현재 레이어의 도구(semaphore 같은)가 설정되어 있는지 여부 */
    boolean isConfigured();

    /**
     * 프로비저닝 완료 후 post-provisioning Ansible job을 실행한다.
     *
     * <p>내부적으로:
     * <ol>
     *   <li>Terraform outputs(vm_ip, vm_hostname 등)으로 static INI 인벤토리를 Semaphore에 생성</li>
     *   <li>playbook을 실행하는 Task Template을 동적으로 생성</li>
     *   <li>Task를 실행하여 inventoryId, templateId, taskId를 반환</li>
     * </ol>
     *
     * @param crName  Provision CR 이름 (인벤토리·템플릿·task 이름 생성에 사용)
     * @param outputs Terraform outputs (key → value 문자열)
     * @return 생성된 inventoryId, templateId, taskId
     */
    PostProvisionResult triggerPostProvisionJob(String crName, Map<String, String> outputs);

    /**
     * 프로비저닝 삭제 시 Semaphore에 생성했던 리소스(sshKey, inventory, template)를 정리한다.
     * projectId는 내부에서 ConfigStore를 통해 읽는다.
     *
     * @param sshKeyId    삭제할 SSH Key ID (-1이면 스킵)
     * @param templateId  삭제할 template ID
     * @param inventoryId 삭제할 inventory ID
     */
    void cleanupPostProvision(int sshKeyId, int templateId, int inventoryId, int environmentId);

    /**
     * Semaphore Task의 실행 상태와 로그 출력을 조회한다.
     * projectId는 내부에서 ConfigStore를 통해 읽는다.
     *
     * @param taskId Semaphore Task ID
     * @return 상태, 성공 여부, 로그 출력
     */
    TaskResult getTaskResult(int taskId);

    record PostProvisionResult(int sshKeyId, int inventoryId, int templateId, int taskId, int environmentId) {}

    record TaskResult(String status, boolean success, String output) {}
}
