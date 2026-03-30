package io.hlab.opencsp.infrastructure.iam;

import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * ConfigStore의 {@code GENERAL/iam.provider} 값을 기준으로
 * 등록된 {@link IamTokenDecoder} 구현체 중 하나에 위임하는 라우터.
 */
@Slf4j
@Primary
@Component
@RequiredArgsConstructor
public class RoutingIamTokenDecoder implements IamTokenDecoder {

    private final ConfigStore configStore;

    @Autowired
    private Map<String, IamTokenDecoder> providers;

    @PostConstruct
    private void removeSelf() {
        providers.entrySet().removeIf(e -> e.getValue() instanceof RoutingIamTokenDecoder);
    }

    @Override
    public IamUserInfo decode(String token) throws IamException {
        return resolve().decode(token);
    }

    @Override
    public IamUserInfo fromClaims(Map<String, Object> claims) {
        return resolve().fromClaims(claims);
    }

    @Override
    public boolean isValid(String token) {
        return resolve().isValid(token);
    }

    private IamTokenDecoder resolve() {
        String provider = configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");
        String beanName = provider + "-iam-decoder";
        IamTokenDecoder decoder = providers.get(beanName);
        if (decoder == null) {
            log.warn("Unknown IAM provider '{}', falling back to 'noop'", provider);
            return providers.get("noop-iam-decoder");
        }
        return decoder;
    }
}
