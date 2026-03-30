package io.hlab.opencsp.infrastructure.semaphore;

import java.util.Map;

/**
 * Ansible Semaphore 연동 추상화.
 *
 * <p>프로비저닝 완료 후 Ansible playbook을 실행하여 post-provisioning 작업(Teleport agent 설치 등)을 자동화한다.
 *
 * <h3>ConfigStore 설정 키 (SEMAPHORE 카테고리)</h3>
 * <pre>
 *   semaphore.url         — Semaphore 서버 주소 (예: https://semaphore.example.com)
 *   semaphore.api.token   — API 토큰 (Semaphore UI: User Settings → API Tokens) [sensitive]
 *   semaphore.project.id  — 프로젝트 ID
 *   semaphore.template.id — post-provisioning용 Task Template ID
 *   semaphore.ssh.key.id  — 인벤토리 연결에 사용할 SSH Key ID
 * </pre>
 */
public interface SemaphoreClient {

    /** Semaphore가 설정되어 있는지 여부 */
    boolean isConfigured();

    /**
     * 프로비저닝 완료 후 post-provisioning Ansible job을 실행한다.
     *
     * <p>내부적으로:
     * <ol>
     *   <li>Terraform outputs(vm_ip, vm_hostname 등)으로 static INI 인벤토리를 Semaphore에 생성</li>
     *   <li>설정된 template으로 Task를 실행하며, 인벤토리를 override한다</li>
     * </ol>
     *
     * @param crName  Provision CR 이름 (인벤토리·task 이름 생성에 사용)
     * @param outputs Terraform outputs (key → value 문자열)
     * @return Semaphore Task ID
     */
    int triggerPostProvisionJob(String crName, Map<String, String> outputs);
}
