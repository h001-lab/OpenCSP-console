package io.hlab.opencsp.infrastructure.iam;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * ConfigStore의 {@code GENERAL/iam.provider} 값을 기준으로
 * 등록된 {@link IamClient} 구현체 중 하나에 위임하는 라우터.
 *
 * <p>새 IAM 공급자 추가 시 이 클래스를 수정하지 않아도 된다.
 * {@code @Component("providerName")} 구현체만 추가하면 자동으로 등록된다.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class RoutingIamClient implements IamClient {

    private final ConfigStore configStore;

    /** Spring이 모든 IamClient 구현체를 bean 이름 → 구현체 형태로 주입 */
    @Autowired
    private Map<String, IamClient> providers;

    @PostConstruct
    private void removeSelf() {
        providers.entrySet().removeIf(e -> e.getValue() instanceof RoutingIamClient);
        log.info("IAM providers registered: {}", providers.keySet());
    }

    @Override
    public void assignRole(String userId, IamRole role) throws IamException {
        resolve().assignRole(userId, role);
    }

    @Override
    public void assignRoles(String userId, List<IamRole> roles) throws IamException {
        resolve().assignRoles(userId, roles);
    }

    @Override
    public void removeRole(String userId, IamRole role) throws IamException {
        resolve().removeRole(userId, role);
    }

    @Override
    public List<IamRole> getUserRoles(String userId) throws IamException {
        return resolve().getUserRoles(userId);
    }

    @Override
    public String getUserSubjectByEmail(String email) throws IamException {
        return resolve().getUserSubjectByEmail(email);
    }

    @Override
    public String getUserEmailBySubject(String subject) throws IamException {
        return resolve().getUserEmailBySubject(subject);
    }

    @Override
    public List<IamUserInfo> listUsers(int limit) throws IamException {
        return resolve().listUsers(limit);
    }

    private IamClient resolve() {
        String provider = configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");
        String beanName = provider + "-iam-client";
        IamClient client = providers.get(beanName);
        if (client == null) {
            log.warn("Unknown IAM provider '{}', falling back to 'noop'", provider);
            return providers.get("noop-iam-client");
        }
        return client;
    }
}
