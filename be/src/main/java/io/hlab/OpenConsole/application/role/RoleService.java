package io.hlab.OpenConsole.application.role;

import io.hlab.OpenConsole.infrastructure.iam.IamClient;
import io.hlab.OpenConsole.infrastructure.iam.IamException;
import io.hlab.OpenConsole.infrastructure.iam.IamRole;
import io.hlab.OpenConsole.infrastructure.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Role 관리 서비스
 * IAM 시스템에서 사용자의 role을 부여/제거/조회
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RoleService {

    private final IamClient iamClient;
    private final JwtUtils jwtUtils;

    /**
     * 사용자에게 role 부여
     * 
     * @param email 사용자 이메일
     * @param role 부여할 role
     * @throws IamException IAM API 호출 실패 시
     */
    public void assignRole(String email, IamRole role) throws IamException {
        assignRoles(email, List.of(role));
    }

    /**
     * 사용자에게 여러 role 부여
     * 
     * @param email 사용자 이메일
     * @param roles 부여할 role 목록
     * @throws IamException IAM API 호출 실패 시
     */
    public void assignRoles(String email, List<IamRole> roles) throws IamException {
        // 1. Email로 subject 조회
        String subject = iamClient.getUserSubjectByEmail(email);
        
        // 2. 각 Role 부여
        iamClient.assignRoles(subject, roles);
        log.info("Roles assigned: email={}, subject={}, roles={}", email, subject, roles);
    }

    /**
     * 사용자로부터 role 제거
     * 
     * @param email 사용자 이메일
     * @param role 제거할 role
     * @throws IamException IAM API 호출 실패 시
     */
    public void removeRole(String email, IamRole role) throws IamException {
        // 1. Email로 subject 조회
        String subject = iamClient.getUserSubjectByEmail(email);
        
        // 2. Role 제거
        iamClient.removeRole(subject, role);
        log.info("Role removed: email={}, subject={}, role={}", email, subject, role);
    }

    /**
     * 사용자의 role 목록 조회
     * 
     * @param email 사용자 이메일
     * @return 사용자가 가진 role 목록
     * @throws IamException IAM API 호출 실패 시
     */
    @Transactional(readOnly = true)
    public List<IamRole> getUserRoles(String email) throws IamException {
        // 1. Email로 subject 조회
        String subject = iamClient.getUserSubjectByEmail(email);
        
        // 2. Role 조회
        List<IamRole> roles = iamClient.getUserRoles(subject);
        log.info("User roles retrieved: email={}, subject={}, roles={}", email, subject, roles);
        return roles;
    }

    /**
     * 현재 로그인한 사용자의 role 목록 조회
     * 
     * @return 현재 사용자가 가진 role 목록
     */
    @Transactional(readOnly = true)
    public List<IamRole> getCurrentUserRoles() {
        return jwtUtils.getCurrentUserRoles();
    }

}

