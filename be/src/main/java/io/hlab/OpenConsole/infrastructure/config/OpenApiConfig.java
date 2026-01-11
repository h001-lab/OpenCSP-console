package io.hlab.OpenConsole.infrastructure.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SpringDoc OpenAPI 설정
 * Swagger UI에서 JWT Bearer 토큰을 사용할 수 있도록 설정
 * 
 * 참고: OAuth2 로그인은 Swagger UI에서 지원하지 않습니다.
 * Zitadel에서 직접 로그인하여 JWT 토큰을 발급받은 후,
 * Swagger UI의 "Authorize" 버튼을 클릭하여 Bearer JWT 토큰을 입력하세요.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("OpenConsole API")
                        .version("1.0.0")
                        .description("""
                                VPS 서비스 백엔드 API 문서
                                
                                ## 인증 방법
                                1. Zitadel에서 로그인하여 JWT 토큰을 발급받으세요.
                                   - 프론트엔드에서 로그인하거나
                                   - 브라우저에서 직접 로그인
                                2. Swagger UI 우측 상단의 "Authorize" 버튼을 클릭하세요.
                                3. "bearer-jwt" 섹션에 JWT 토큰을 입력하세요.
                                   (예: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...)
                                4. "Authorize" 버튼을 클릭하여 저장하세요.
                                
                                ## JWT 토큰 발급 방법
                                - 브라우저 개발자 도구 → Application/Storage 탭에서 확인
                                - 또는 Network 탭에서 API 요청의 Authorization 헤더 확인
                                - 자세한 내용은 docs/ZITADEL_JWT_TOKEN_GUIDE.md 참고
                                """))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Zitadel에서 발급받은 JWT 토큰을 입력하세요. 'Bearer ' 접두사는 자동으로 추가됩니다.")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}

