package io.hlab.opencsp.infrastructure.config;

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
                        .title("OpenCSP-Console API")
                        .version("1.0.0")
                        .description("""
                                OpenCSP Console API Documentation
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

