package cm.mboaride.service;

import cm.mboaride.entity.Notification;
import cm.mboaride.entity.Utilisateur;
import cm.mboaride.enums.CanalNotification;
import cm.mboaride.repository.NotificationRepository;
import cm.mboaride.repository.UtilisateurRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Notifications push (Expo Push API → FCM/APNs), avec SMS de secours si le push n'est pas délivré (BF-65, BF-66),
 * rédigées dans la langue de l'utilisateur (BF-67). Chaque envoi est historisé.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
  private final RestClient restClient;
  private final SmsService smsService;
  private final MessageSource messageSource;
  private final NotificationRepository notificationRepository;
  private final UtilisateurRepository utilisateurRepository;
  private final RealtimeService realtime;

  @Value("${push.expo-url}") private String expoUrl;

  /** Traduit une clé de message dans la langue de l'utilisateur. */
  public String texte(Utilisateur user, String cle, Object... args) {
    Locale locale = "en".equalsIgnoreCase(user.getLangue()) ? Locale.ENGLISH : Locale.FRENCH;
    return messageSource.getMessage(cle, args, cle, locale);
  }

  /**
   * Notifie un utilisateur. Les clés {@code notif.<type>.titre} et {@code notif.<type>.corps} sont traduites.
   * @param smsSiEchec envoie un SMS si la notification push ne peut pas être délivrée
   */
  @Async
  public void notifier(Long userId, String type, Long courseId, boolean smsSiEchec, Object... args) {
    utilisateurRepository.findById(userId).ifPresent(user -> notifierSync(user, type, courseId, smsSiEchec, args));
  }

  public void notifierSync(Utilisateur user, String type, Long courseId, boolean smsSiEchec, Object... args) {
    String titre = texte(user, "notif." + type + ".titre", args);
    String corps = texte(user, "notif." + type + ".corps", args);
    envoyerDirect(user, titre, corps, type, courseId, smsSiEchec);
  }

  /** Envoi d'un texte déjà rédigé (campagnes). */
  public boolean envoyerDirect(Utilisateur user, String titre, String corps, String type, Long courseId, boolean smsSiEchec) {
    boolean push = envoyerPush(user.getPushToken(), titre, corps, type, courseId);
    CanalNotification canal = CanalNotification.INAPP;
    if (push) {
      canal = CanalNotification.PUSH;
    } else if (smsSiEchec && smsService.envoyer(user.getTelephone(), "MboaRide - " + titre + " : " + corps)) {
      canal = CanalNotification.SMS;
    }
    Notification saved = notificationRepository.save(Notification.builder()
        .utilisateurId(user.getId()).titre(titre).corps(corps).type(type).canal(canal).courseId(courseId).build());
    realtime.envoyer(user.getId(), "/queue/notifications", "NOTIFICATION",
        Map.of("id", saved.getId(), "titre", titre, "corps", corps, "type", type));
    return push || canal == CanalNotification.SMS;
  }

  /** Campagne de notification (BF-63), envoyée en tâche de fond. */
  @Async
  public void envoyerCampagne(List<Long> ids, String titre, String message, boolean avecSms) {
    for (Long id : ids) {
      utilisateurRepository.findById(id).ifPresent(u -> envoyerDirect(u, titre, message, "campagne", null, avecSms));
    }
  }

  /** Envoie via l'API Expo Push ; vrai seulement si le ticket est « ok ». */
  boolean envoyerPush(String token, String titre, String corps, String type, Long courseId) {
    if (token == null || !token.startsWith("ExponentPushToken")) {
      return false;
    }
    try {
      Map<String, Object> data = courseId == null ? Map.of("type", type) : Map.of("type", type, "courseId", courseId);
      JsonNode res = restClient.post().uri(expoUrl)
          .contentType(MediaType.APPLICATION_JSON)
          .accept(MediaType.APPLICATION_JSON)
          .body(List.of(Map.of("to", token, "title", titre, "body", corps, "sound", "default",
              "priority", "high", "channelId", "default", "data", data)))
          .retrieve()
          .body(JsonNode.class);
      JsonNode ticket = res == null ? null : res.path("data").path(0);
      boolean ok = ticket != null && "ok".equals(ticket.path("status").asText());
      if (!ok) {
        log.info("Push non délivré ({}), bascule SMS possible", ticket);
      }
      return ok;
    } catch (Exception ex) {
      log.info("Push Expo indisponible : {}", ex.getMessage());
      return false;
    }
  }
}
