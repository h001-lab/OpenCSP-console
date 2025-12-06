package io.hlab.OpenConsole.ai_example;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/ai")
@Slf4j
public class AiController {
  // ##### 필드 #####
  @Autowired
  private AiService aiService;
  
  // @Autowired
  // private AiServiceByChatClient aiService;

  // ##### 요청 매핑 메소드 #####
  @PostMapping(
    value = "/chat-model",
    consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, // 요청 본문으로 Form URL Encoded 데이터 수신
    produces = MediaType.TEXT_PLAIN_VALUE // 응답 본문으로 Plain Text 반환
  )
  public String chatModel(@RequestParam("question") String question) {
    String answerText = aiService.generateText(question, "dd");
    return answerText;
  }

  @PostMapping(
    value = "/chat-model-stream",
    consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
    produces = MediaType.APPLICATION_NDJSON_VALUE //라인으로 구분된 청크 텍스트
  )
  public Flux<String> chatModelStream(@RequestParam("question") String question) {
    Flux<String> answerStreamText = aiService.generateStreamText(question);
    return answerStreamText;
  }
}
