package cm.mboaride.service;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/** Diffusion d'événements temps réel (WebSocket STOMP) vers un utilisateur précis. */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeService {
  public static final String FILE_COURSES = "/queue/courses";
  public static final String FILE_DEMANDES = "/queue/demandes";
  public static final String FILE_MESSAGES = "/queue/messages";

  private final SimpMessagingTemplate template;

  /** Envoie { type, data } sur la file privée de l'utilisateur. */
  public void envoyer(Long userId, String file, String type, Object data) {
    if (userId == null) {
      return;
    }
    try {
      template.convertAndSendToUser(String.valueOf(userId), file, Map.of("type", type, "data", data));
    } catch (Exception ex) {
      log.debug("Événement temps réel non délivré à {} : {}", userId, ex.getMessage());
    }
  }

  public void diffuser(String topic, String type, Object data) {
    try {
      template.convertAndSend(topic, Map.of("type", type, "data", data));
    } catch (Exception ex) {
      log.debug("Diffusion {} impossible : {}", topic, ex.getMessage());
    }
  }
}
