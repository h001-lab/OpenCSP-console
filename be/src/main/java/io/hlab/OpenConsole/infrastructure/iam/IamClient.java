package io.hlab.OpenConsole.infrastructure.iam;

import java.util.List;

/**
 * IAM 클라이언트 인터페이스
 * IAM 시스템에 role을 부여하거나 관리하는 기능을 추상화
 * 
 * 구현체는 각 IAM 솔루션별로 제공됨 (예: ZitadelClient, KeycloakClient)
 */
public interface IamClient {

    /**
     * 사용자에게 role을 부여
     * 
     * @param userId IAM의 사용자 ID (subject)
     * @param role 부여할 role
     * @throws IamException IAM API 호출 실패 시
     */
    void assignRole(String userId, IamRole role) throws IamException;

    /**
     * 사용자에게 여러 role을 부여
     * 
     * @param userId IAM의 사용자 ID (subject)
     * @param roles 부여할 role 목록
     * @throws IamException IAM API 호출 실패 시
     */
    void assignRoles(String userId, List<IamRole> roles) throws IamException;

    /**
     * 사용자로부터 role을 제거
     * 
     * @param userId IAM의 사용자 ID (subject)
     * @param role 제거할 role
     * @throws IamException IAM API 호출 실패 시
     */
    void removeRole(String userId, IamRole role) throws IamException;

    /**
     * 사용자의 모든 role 목록 조회
     * 
     * @param userId IAM의 사용자 ID (subject)
     * @return 사용자가 가진 role 목록
     * @throws IamException IAM API 호출 실패 시
     */
    List<IamRole> getUserRoles(String userId) throws IamException;

    /**
     * Email로 사용자의 subject 조회
     * 
     * @param email 사용자 이메일
     * @return IAM의 사용자 ID (subject)
     * @throws IamException IAM API 호출 실패 시
     */
    String getUserSubjectByEmail(String email) throws IamException;

    /**
     * Subject로 사용자의 email 조회
     * 
     * @param subject IAM의 사용자 ID (subject)
     * @return 사용자 이메일
     * @throws IamException IAM API 호출 실패 시
     */
    String getUserEmailBySubject(String subject) throws IamException;
}

