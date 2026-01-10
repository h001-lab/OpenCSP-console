package io.hlab.OpenConsole;

import io.hlab.OpenConsole.infrastructure.iam.zitadel.client.ZitadelAuthExecutor;
import io.hlab.OpenConsole.infrastructure.iam.zitadel.client.ZitadelUserExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

/**
 * Spring Boot 애플리케이션 컨텍스트 로드 테스트
 * 
 * <p>Zitadel 관련 Executor는 모킹하여 실제 API 호출을 방지합니다.
 * 테스트 환경에서는 실제 Zitadel 서버가 없으므로 모킹이 필요합니다.
 */
@SpringBootTest
@ActiveProfiles("test")
class OpenConsoleApplicationTests {

    @MockBean
    private ZitadelAuthExecutor zitadelAuthExecutor;

    @MockBean
    private ZitadelUserExecutor zitadelUserExecutor;

	@Test
	void contextLoads() {
	}

}
