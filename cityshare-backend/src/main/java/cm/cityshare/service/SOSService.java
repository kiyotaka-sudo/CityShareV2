package cm.cityshare.service;

import cm.cityshare.dto.request.SOSRequest;
import cm.cityshare.entity.AlerteSOS;
import cm.cityshare.entity.Passager;
import cm.cityshare.entity.Utilisateur;
import cm.cityshare.repository.AlerteSOSRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SOSService {
  private final AlerteSOSRepository alerteSOSRepository;
  private final AuthService authService;
  private final NotificationService notificationService;

  public AlerteSOS createAlert(SOSRequest request) {
    return createAlertFor(authService.currentUser(), request);
  }

  public AlerteSOS createAutoAlert(Passager passager) {
    return createAlertFor(passager, SOSRequest.builder().type("AUTO_DEAD_MAN_SWITCH").build());
  }

  public List<AlerteSOS> mine() {
    return alerteSOSRepository.findByDeclencheurId(authService.currentUser().getId());
  }

  private AlerteSOS createAlertFor(Utilisateur user, SOSRequest request) {
    AlerteSOS alert = AlerteSOS.builder()
        .declencheur(user)
        .latitude(request.getLatitude())
        .longitude(request.getLongitude())
        .adresseApprox(request.getAdresseApprox())
        .type(request.getType() == null ? "MANUEL" : request.getType())
        .contactNotifie(user instanceof Passager)
        .build();
    AlerteSOS saved = alerteSOSRepository.save(alert);
    notificationService.sendToUser(user.getFcmToken(), "Alerte SOS", "Votre alerte CityShare a été enregistrée.");
    return saved;
  }
}
