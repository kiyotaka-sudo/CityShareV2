package cm.cityshare.service;

import cm.cityshare.entity.Reservation;
import cm.cityshare.repository.ReservationRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeadManSwitchService {
  private final ReservationRepository reservationRepository;
  private final SOSService sosService;
  private final NotificationService notificationService;

  @Scheduled(fixedDelay = 60000)
  public void checkDeadManSwitch() {
    List<Reservation> expired = reservationRepository.findExpiredDeadManSwitch(LocalDateTime.now());
    for (Reservation reservation : expired) {
      sosService.createAutoAlert(reservation.getPassager());
      notificationService.sendToUser(
          reservation.getPassager().getFcmToken(),
          "⚠️ Alerte automatique",
          "Votre arrivée n'a pas été confirmée. Êtes-vous en sécurité ?"
      );
    }
  }
}
