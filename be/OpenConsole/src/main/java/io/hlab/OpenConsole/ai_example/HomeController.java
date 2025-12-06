package io.hlab.OpenConsole.ai_example;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
public class HomeController {
  @GetMapping("/")
  public String home() {
    return "home";
  }
  
  @GetMapping("/chat-model")
  public String chatModel() {
    return "chat-model";
  }  
  
  @GetMapping("/chat-model-stream")
  public String chatModelStream() {
    return "chat-model-stream";
  }   
}
