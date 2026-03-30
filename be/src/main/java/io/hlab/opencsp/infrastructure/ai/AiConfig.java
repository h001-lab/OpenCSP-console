package io.hlab.opencsp.infrastructure.ai;

import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring AI OpenAI 빈을 조건부로 등록한다.
 * <p>
 * {@code app.ai.enabled=true}(= 환경변수 {@code APP_AI_ENABLED=true})이고
 * {@code SPRING_AI_OPENAI_API_KEY}가 설정된 경우에만 활성화된다.
 * 키가 없으면 이 클래스 전체가 무시되어 관련 빈이 생성되지 않는다.
 */
@Configuration
@ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true")
public class AiConfig {

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    @Value("${spring.ai.openai.chat.base-url:https://generativelanguage.googleapis.com/v1beta/openai/}")
    private String baseUrl;

    @Value("${spring.ai.openai.chat.completions-path:/chat/completions}")
    private String completionsPath;

    @Value("${spring.ai.openai.chat.options.model:gemini-2.0-flash-lite}")
    private String model;

    @Value("${spring.ai.openai.chat.options.temperature:0.0}")
    private Double temperature;

    @Value("${spring.ai.openai.chat.options.max-tokens:1024}")
    private Integer maxTokens;

    @Bean
    public OpenAiApi openAiApi() {
        return OpenAiApi.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .completionsPath(completionsPath)
                .build();
    }

    @Bean
    public OpenAiChatModel openAiChatModel(OpenAiApi openAiApi) {
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(model)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
    }
}
