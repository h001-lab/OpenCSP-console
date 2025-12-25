package io.hlab.OpenConsole.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JITUserProvisioningHandler jitUserProvisioningHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated() // 모든 요청은 로그인 필요
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler(jitUserProvisioningHandler) // 로그인 성공 시 우리 DB에 저장!
            );
        
        return http.build();
    }
}
