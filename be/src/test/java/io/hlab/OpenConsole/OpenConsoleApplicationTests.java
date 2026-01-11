package io.hlab.OpenConsole;

import io.hlab.OpenConsole.infrastructure.iam.IamClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

/**
 * Spring Boot 애플리케이션 컨텍스트 로드 테스트
 * 
 * <p>테스트 환경에서는 실제 Zitadel 서버가 없으므로 IamClient를 모킹합니다.
 * test 프로필에서는 ZitadelClient가 생성되지 않으므로 IamClient를 @MockBean으로 모킹합니다.
 */
@SpringBootTest
@ActiveProfiles("test")
class OpenConsoleApplicationTests {

    @MockBean
    private IamClient iamClient;

	@Test
	void contextLoads() {
	}

}
