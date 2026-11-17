package cm.cityshare.service;

import cm.cityshare.dto.request.ReservationRequest;
import cm.cityshare.dto.response.QRCodeResponse;
import cm.cityshare.dto.response.QRValidateResponse;
import cm.cityshare.dto.response.ReservationResponse;
import cm.cityshare.entity.Conducteur;
import cm.cityshare.entity.Passager;
import cm.cityshare.entity.Reservation;
import cm.cityshare.entity.Trajet;
import cm.cityshare.entity.Utilisateur;
import cm.cityshare.enums.StatutReservation;
import cm.cityshare.enums.StatutTrajet;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.exception.UnauthorizedException;
import cm.cityshare.repository.ReservationRepository;
import cm.cityshare.repository.TrajetRepository;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReservationService {
  private final ReservationRepository reservationRepository;
  private final TrajetRepository trajetRepository;
  private final AuthService authService;
  private final TrajetService trajetService;
  private final QRCodeService qrCodeService;
  private final NotificationService notificationService;

  @Transactional
  public ReservationResponse createReservation(ReservationRequest request) {
    if (!(authService.currentUser() instanceof Passager passager)) {
      throw new UnauthorizedException("Accès réservé aux passagers");
    }
    Trajet trajet = trajetRepository.findById(request.getTrajetId()).orElseThrow(() -> new ResourceNotFoundException("Trajet introuvable"));
    int places = request.getNbPlaces() == null ? 1 : request.getNbPlaces();
    if (trajet.getNbPlacesDispo() < places) throw new IllegalArgumentException("Places insuffisantes");
    Reservation reservation = Reservation.builder()
        .trajet(trajet)
        .passager(passager)
        .nbPlaces(places)
        .prixTotal(trajet.getPrixParPlace() * places)
        .statut(StatutReservation.EN_ATTENTE)
        .qrCodeToken(UUID.randomUUID().toString())
        .build();
    trajet.setNbPlacesDispo(trajet.getNbPlacesDispo() - places);
    if (trajet.getNbPlacesDispo() == 0) trajet.setStatut(StatutTrajet.COMPLET);
    trajetRepository.save(trajet);
    Reservation saved = reservationRepository.save(reservation);
    notificationService.sendToUser(trajet.getConducteur().getFcmToken(), "Nouveau passager", "Une nouvelle réservation a été confirmée.");
    return toResponse(saved);
  }

  public List<ReservationResponse> mine() {
    return reservationRepository.findByPassagerId(authService.currentUser().getId()).stream().map(this::toResponse).toList();
  }

  public List<ReservationResponse> conducteurReservations() {
    if (!(authService.currentUser() instanceof Conducteur conducteur)) {
      throw new UnauthorizedException("Accès réservé aux conducteurs");
    }
    return reservationRepository.findBoardingByConducteurId(conducteur.getId()).stream().map(this::toResponse).toList();
  }

  public QRCodeResponse getQRCode(Long id) {
    Reservation reservation = find(id);
    return QRCodeResponse.builder()
        .qrCodeToken(reservation.getQrCodeToken())
        .qrCodeBase64(qrCodeService.generateQRCodeBase64(reservation.getQrCodeToken()))
        .build();
  }

  @Transactional
  public QRValidateResponse validateQR(Long reservationId, String token) {
    Reservation reservation = find(reservationId);
    assertCanValidateBoarding(reservation);
    if (token == null || !reservation.getQrCodeToken().equals(token.trim())) {
      return QRValidateResponse.builder()
          .valid(false)
          .message("QR Code invalide")
          .build();
    }
    if (reservation.getStatut() != StatutReservation.CONFIRMEE && reservation.getStatut() != StatutReservation.VALIDEE) {
      return QRValidateResponse.builder()
          .valid(false)
          .message("Réservation non payée ou invalide")
          .build();
    }
    if (Boolean.TRUE.equals(reservation.getQrCodeScanne())) {
      return QRValidateResponse.builder()
          .valid(false)
          .message("Embarquement déjà validé")
          .build();
    }
    reservation.setQrCodeScanne(true);
    reservation.setStatut(StatutReservation.VALIDEE);
    reservation.setDeadManSwitchDeadline(reservation.getTrajet().getDateHeure().plus(Duration.ofHours(3)).plusMinutes(30));
    Trajet trajet = reservation.getTrajet();
    if (trajet.getStatut() != StatutTrajet.EN_COURS && trajet.getStatut() != StatutTrajet.TERMINE) {
      trajet.setStatut(StatutTrajet.EN_COURS);
      trajetRepository.save(trajet);
    }
    ReservationResponse saved = toResponse(reservationRepository.save(reservation));
    notificationService.sendToUser(
        reservation.getPassager().getFcmToken(),
        "Trajet démarré",
        "Votre conducteur a validé l'embarquement. Bon voyage !");
    return QRValidateResponse.builder()
        .valid(true)
        .message("Embarquement validé — trajet démarré")
        .reservation(saved)
        .build();
  }

  @Transactional
  public QRValidateResponse validateArrivalQR(Long reservationId, String token) {
    Reservation reservation = find(reservationId);
    if (!(authService.currentUser() instanceof Conducteur conducteur)
        || !reservation.getTrajet().getConducteur().getId().equals(conducteur.getId())) {
      throw new UnauthorizedException("Seul le conducteur peut valider l'arrivée");
    }
    if (!Boolean.TRUE.equals(reservation.getQrCodeScanne())) {
      return QRValidateResponse.builder()
          .valid(false)
          .message("Validez d'abord l'embarquement")
          .build();
    }
    if (token == null || !reservation.getQrCodeToken().equals(token.trim())) {
      return QRValidateResponse.builder()
          .valid(false)
          .message("QR d'arrivée invalide")
          .build();
    }
    if (Boolean.TRUE.equals(reservation.getArriveeConfirmee())) {
      return QRValidateResponse.builder()
          .valid(false)
          .message("Arrivée déjà confirmée")
          .build();
    }
    reservation.setArriveeConfirmee(true);
    reservation.setStatut(StatutReservation.TERMINEE);
    reservation.setDeadManSwitchDeadline(null);
    Reservation saved = reservationRepository.save(reservation);
    notificationService.sendToUser(
        reservation.getPassager().getFcmToken(),
        "Trajet terminé",
        "Arrivée confirmée. Merci d'avoir voyagé avec CityShare !");
    return QRValidateResponse.builder()
        .valid(true)
        .message("Arrivée confirmée — course terminée")
        .reservation(toResponse(saved))
        .build();
  }

  @Transactional
  public ReservationResponse confirmerArrivee(Long reservationId) {
    Reservation reservation = find(reservationId);
    if (!Boolean.TRUE.equals(reservation.getQrCodeScanne())) {
      throw new IllegalArgumentException("Embarquement non validé");
    }
    reservation.setArriveeConfirmee(true);
    reservation.setStatut(StatutReservation.TERMINEE);
    reservation.setDeadManSwitchDeadline(null);
    notificationService.sendToUser(reservation.getPassager().getFcmToken(), "Trajet terminé", "Comment s'est passé votre trajet ?");
    return toResponse(reservationRepository.save(reservation));
  }

  public Reservation find(Long id) {
    return reservationRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Réservation introuvable"));
  }

  private void assertCanValidateBoarding(Reservation reservation) {
    Utilisateur user = authService.currentUser();
    boolean isPassager = user instanceof Passager passager && passager.getId().equals(reservation.getPassager().getId());
    boolean isConducteur = user instanceof Conducteur conducteur
        && conducteur.getId().equals(reservation.getTrajet().getConducteur().getId());
    if (!isPassager && !isConducteur) {
      throw new UnauthorizedException("Vous ne pouvez pas valider cette réservation");
    }
  }

  public ReservationResponse toResponse(Reservation reservation) {
    return ReservationResponse.builder()
        .id(reservation.getId())
        .trajet(trajetService.toResponse(reservation.getTrajet()))
        .passager(authService.toUserResponse(reservation.getPassager()))
        .nbPlaces(reservation.getNbPlaces())
        .prixTotal(reservation.getPrixTotal())
        .statut(reservation.getStatut())
        .qrCodeToken(reservation.getQrCodeToken())
        .qrCodeScanne(reservation.getQrCodeScanne())
        .arriveeConfirmee(reservation.getArriveeConfirmee())
        .build();
  }
}
