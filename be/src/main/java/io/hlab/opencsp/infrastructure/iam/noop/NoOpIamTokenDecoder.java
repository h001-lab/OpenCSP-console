package io.hlab.opencsp.infrastructure.iam.noop;

import io.hlab.opencsp.infrastructure.iam.IamRole;
import io.hlab.opencsp.infrastructure.iam.IamTokenDecoder;
import io.hlab.opencsp.infrastructure.iam.IamUserInfo;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * IAM 미구성 시 사용하는 No-op IamTokenDecoder 구현체.
 * <p>
 * {@code app.iam.provider=none}(기본값)일 때 활성화된다.
 * JWT claims에서 기본 필드만 추출하고 role은 빈 목록을 반환한다.
 */
@Component("noop-iam-decoder")
public class NoOpIamTokenDecoder implements IamTokenDecoder {

    @Override
    public IamUserInfo decode(String token) {
        return IamUserInfo.of("unknown", "", "", List.of());
    }

    @Override
    public IamUserInfo fromClaims(Map<String, Object> claims) {
        String subject = (String) claims.getOrDefault("sub", "unknown");
        String email = (String) claims.getOrDefault("email", "");
        String name = (String) claims.getOrDefault("name", "");
        return IamUserInfo.of(subject, email, name, List.of(IamRole.ADMIN));
    }

    @Override
    public boolean isValid(String token) {
        return true;
    }
}
