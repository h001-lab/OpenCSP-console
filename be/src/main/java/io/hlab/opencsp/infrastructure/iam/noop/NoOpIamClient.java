package io.hlab.opencsp.infrastructure.iam.noop;

import io.hlab.opencsp.infrastructure.iam.IamClient;
import io.hlab.opencsp.infrastructure.iam.IamRole;
import io.hlab.opencsp.infrastructure.iam.IamUserInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * IAM 미구성 시 사용하는 No-op IamClient 구현체.
 * <p>
 * {@code app.iam.provider=none}(기본값)일 때 활성화된다.
 * 모든 IAM 호출을 무시하고 경고 로그를 출력한다.
 */
@Slf4j
@Component("noop-iam-client")
public class NoOpIamClient implements IamClient {

    private static final String WARN_MSG = "NoOpIamClient: IAM not configured (APP_IAM_PROVIDER=none). Operation '{}' ignored.";

    @Override
    public void assignRole(String userId, IamRole role) {
        log.warn(WARN_MSG, "assignRole(" + userId + ", " + role + ")");
    }

    @Override
    public void assignRoles(String userId, List<IamRole> roles) {
        log.warn(WARN_MSG, "assignRoles(" + userId + ", " + roles + ")");
    }

    @Override
    public void removeRole(String userId, IamRole role) {
        log.warn(WARN_MSG, "removeRole(" + userId + ", " + role + ")");
    }

    @Override
    public List<IamRole> getUserRoles(String userId) {
        log.warn(WARN_MSG, "getUserRoles(" + userId + ")");
        return List.of();
    }

    @Override
    public String getUserSubjectByEmail(String email) {
        log.warn(WARN_MSG, "getUserSubjectByEmail(" + email + ")");
        return email;
    }

    @Override
    public String getUserEmailBySubject(String subject) {
        log.warn(WARN_MSG, "getUserEmailBySubject(" + subject + ")");
        return subject;
    }

    @Override
    public List<IamUserInfo> listUsers(int limit) {
        log.warn(WARN_MSG, "listUsers(" + limit + ")");
        return List.of();
    }
}
