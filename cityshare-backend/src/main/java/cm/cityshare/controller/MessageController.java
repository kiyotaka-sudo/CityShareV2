package cm.cityshare.controller;

import cm.cityshare.dto.request.SendMessageRequest;
import cm.cityshare.dto.response.MessageResponse;
import cm.cityshare.service.MessagerieService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {
  private final MessagerieService messagerieService;

  @GetMapping("/conversation/{userId}")
  public List<MessageResponse> conversation(@PathVariable Long userId) {
    return messagerieService.conversation(userId);
  }

  @PostMapping
  public ResponseEntity<MessageResponse> send(@Valid @RequestBody SendMessageRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(messagerieService.sendMessage(request));
  }

  @MessageMapping("/chat.send")
  public MessageResponse send(Map<String, Object> payload) {
    return messagerieService.handleMessage(payload);
  }
}
