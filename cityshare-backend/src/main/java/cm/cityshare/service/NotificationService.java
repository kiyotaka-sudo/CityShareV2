package cm.cityshare.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NotificationService {
  public void sendToUser(String fcmToken, String title, String body) {
    if (fcmToken == null || fcmToken.isBlank()) {
      log.info("Notification ignorée sans token: {} - {}", title, body);
      return;
    }
    try {
      com.google.firebase.messaging.Message message = com.google.firebase.messaging.Message.builder()
          .setToken(fcmToken)
          .setNotification(Notification.builder().setTitle(title).setBody(body).build())
          .build();
      FirebaseMessaging.getInstance().send(message);
    } catch (Exception ex) {
      log.warn("Notification FCM non envoyée: {}", ex.getMessage());
    }
  }
}
