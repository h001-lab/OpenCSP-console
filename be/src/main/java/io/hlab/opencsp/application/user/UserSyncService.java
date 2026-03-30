package io.hlab.opencsp.application.user;

import io.hlab.opencsp.domain.user.User;
import io.hlab.opencsp.domain.user.UserRepository;
import io.hlab.opencsp.infrastructure.iam.IamClient;
import io.hlab.opencsp.infrastructure.iam.IamUserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * IAM → 로컬 DB 사용자 동기화 서비스.
 * POST /api/admin/users/sync 호출 시 실행된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSyncService {

    private final IamClient iamClient;
    private final UserRepository userRepository;

    public record SyncResult(int total, int created, int updated) {}

    @Transactional
    public SyncResult syncFromIam() {
        List<IamUserInfo> iamUsers = iamClient.listUsers(1000);

        int created = 0;
        int updated = 0;

        for (IamUserInfo iam : iamUsers) {
            if (iam.getSubject() == null || iam.getSubject().isBlank()) continue;

            String roles = iam.getRoles().stream()
                    .map(r -> r.getValue())
                    .reduce((a, b) -> a + "," + b)
                    .orElse(null);
            String email = iam.getEmail() != null ? iam.getEmail() : (iam.getSubject() + "@unknown");
            String name  = iam.getName()  != null ? iam.getName()  : iam.getSubject();

            // iamSubject 기준 조회 → 없으면 email로 fallback (JIT 프로비저닝 사용자 연결)
            Optional<User> existing = userRepository.findByIamSubject(iam.getSubject());
            if (existing.isEmpty()) {
                existing = userRepository.findByEmail(email);
            }

            if (existing.isPresent()) {
                existing.get().syncFromIam(email, name, roles, "ACTIVE");
                userRepository.save(existing.get());
                updated++;
            } else {
                userRepository.save(User.fromIam(iam.getSubject(), email, name, roles, "ACTIVE"));
                created++;
            }
        }

        log.info("[UserSync] 완료: total={}, created={}, updated={}", iamUsers.size(), created, updated);
        return new SyncResult(iamUsers.size(), created, updated);
    }
}
