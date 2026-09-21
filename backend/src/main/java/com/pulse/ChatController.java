package com.pulse;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
  private final ChatService chat;

  public ChatController(ChatService chat) {
    this.chat = chat;
  }

  @GetMapping("/status")
  public Map<String, Object> status() {
    return chat.status();
  }

  @PostMapping
  public Map<String, String> answer(@RequestBody ChatService.Request request) {
    return chat.answer(request);
  }
}
