package io.hlab.OpenConsole.ai_example;

import java.io.IOException;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

@Service
@Slf4j
public class AiService {
  // ##### 필드 #####
  @Autowired
  private ChatModel chatModel;

  public String generateText(String question, String str) {

        System.out.println("question: " + question);
        System.out.println("chatModel: " + chatModel);

        SystemMessage systemMessage = SystemMessage.builder()
            .text("한국어로 답해라~~")
            .build();

        UserMessage userMessage = UserMessage.builder()
            .text(question)
            .build();

        Prompt prompt = Prompt.builder()
            .messages(systemMessage, userMessage)
            .build();

        ChatResponse chatResponse = chatModel.call(prompt);

        AssistantMessage assistantMessage = chatResponse.getResult().getOutput();
        String answerText = assistantMessage.getText();

        return answerText;
    }


  // ##### 메소드 #####
  public String generateText(String question) {
    // 시스템 메시지 생성
    SystemMessage systemMessage = SystemMessage.builder()
        .text("사용자 질문에 대해 한국어로 답변을 해야 합니다.")
        .build();

    // 사용자 메시지 생성
    UserMessage userMessage = UserMessage.builder()
        .text(question)
        .build();
    
    // 대화 옵션 설정
    ChatOptions chatOptions = ChatOptions.builder()
        .model("gpt-4o-mini")
        .temperature(0.3)
        .maxTokens(1000)
        .build();

    // 프롬프트 생성
    Prompt prompt = Prompt.builder()
        .messages(systemMessage, userMessage)
        .chatOptions(chatOptions)
        .build();

    // LLM에게 요청하고 응답받기
    ChatResponse chatResponse = chatModel.call(prompt);
    AssistantMessage assistantMessage = chatResponse.getResult().getOutput();
    String answer = assistantMessage.getText();

    return answer;
  }

  public Flux<String> generateStreamText(String question) {
    // 시스템 메시지 생성
    SystemMessage systemMessage = SystemMessage.builder()
        .text("사용자 질문에 대해 한국어로 답변을 해야 합니다.")
        .build();

    // 사용자 메시지 생성
    UserMessage userMessage = UserMessage.builder()
        .text(question)
        .build();

    // 대화 옵션 설정
    ChatOptions chatOptions = ChatOptions.builder()
        .model("gpt-4o")
        .temperature(0.3)
        .maxTokens(1000)
        .build();

    // 프롬프트 생성
    Prompt prompt = Prompt.builder()
        .messages(systemMessage, userMessage)
        .chatOptions(chatOptions)
        .build();

    // LLM에게 요청하고 응답받기
    Flux<ChatResponse> fluxResponse = chatModel.stream(prompt);
    Flux<String> fluxString = fluxResponse.map(chatResponse -> {
      AssistantMessage assistantMessage = chatResponse.getResult().getOutput();
      String chunk = assistantMessage.getText();
      if (chunk == null) chunk = "";
      return chunk;
    });

    return fluxString;
  }
}
