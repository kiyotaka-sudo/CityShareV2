package cm.cityshare.service;

import cm.cityshare.dto.request.ArretRequest;
import cm.cityshare.dto.request.TrajetRequest;
import cm.cityshare.dto.response.TrajetResponse;
import cm.cityshare.entity.ArretIntermediaire;
import cm.cityshare.entity.Conducteur;
import cm.cityshare.entity.Reservation;
import cm.cityshare.entity.Trajet;
import cm.cityshare.enums.StatutTrajet;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.exception.UnauthorizedException;
import cm.cityshare.repository.ReservationRepository;
import cm.cityshare.repository.TrajetRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TrajetService {
  private final TrajetRepository trajetRepository;
  private final ReservationRepository reservationRepository;
  private final AuthService authService;
  private final NotificationService notificationService;

  @Transactional
  public TrajetResponse createTrajet(TrajetRequest request) {
    Conducteur conducteur = requireConducteur();
    Trajet trajet = Trajet.builder()
        .conducteur(conducteur)
        .villeDepart(request.getVilleDepart())
        .villeArrivee(request.getVilleArrivee())
        .latDepart(request.getLatDepart())
        .lngDepart(request.getLngDepart())
        .latArrivee(request.getLatArrivee())
        .lngArrivee(request.getLngArrivee())
        .dateHeure(request.getDateHeure())
        .nbPlacesTotal(request.getNbPlacesTotal())
        .nbPlacesDispo(request.getNbPlacesTotal())
        .prixParPlace(request.getPrixParPlace())
        .accepteColis(Boolean.TRUE.equals(request.getAccepteColis()))
        .autoriseArrets(Boolean.TRUE.equals(request.getAutoriseArrets()))
        .statut(StatutTrajet.ACTIF)
        .build();
    List<ArretRequest> arrets = request.getArrets() == null ? List.of() : request.getArrets();
    for (ArretRequest arretRequest : arrets) {
      ArretIntermediaire arret = ArretIntermediaire.builder()
          .trajet(trajet)
          .ville(arretRequest.getVille())
          .latitude(arretRequest.getLatitude())
          .longitude(arretRequest.getLongitude())
          .ordre(arretRequest.getOrdre())
          .heurePassage(arretRequest.getHeurePassage())
          .build();
      trajet.getArrets().add(arret);
    }
    return toResponse(trajetRepository.save(trajet));
  }

  public List<TrajetResponse> searchTrajets(String depart, String arrivee, LocalDate date, Integer places) {
    List<Trajet> trajets = depart == null || arrivee == null || date == null
        ? trajetRepository.findAllActifs()
        : trajetRepository.findByRoute(depart, arrivee, places == null ? 1 : places, date);
    return trajets.stream().map(this::toResponse).toList();
  }

  public TrajetResponse getTrajet(Long id) {
    return toResponse(find(id));
  }

  public List<TrajetResponse> listByConducteur() {
    Conducteur conducteur = requireConducteur();
    return trajetRepository.findByConducteurId(conducteur.getId()).stream().map(this::toResponse).toList();
  }

  @Transactional
  public TrajetResponse updateTrajet(Long id, TrajetRequest request) {
    Trajet trajet = ownedTrajet(id);
    if (trajet.getStatut() == StatutTrajet.TERMINE) {
      throw new IllegalArgumentException("Impossible de modifier un trajet terminé");
    }
    int reserved = trajet.getNbPlacesTotal() - trajet.getNbPlacesDispo();
    int newTotal = request.getNbPlacesTotal();
    if (newTotal < reserved) {
      throw new IllegalArgumentException("Nombre de places insuffisant pour les réservations existantes");
    }
    trajet.setVilleDepart(request.getVilleDepart());
    trajet.setVilleArrivee(request.getVilleArrivee());
    trajet.setLatDepart(request.getLatDepart());
    trajet.setLngDepart(request.getLngDepart());
    trajet.setLatArrivee(request.getLatArrivee());
    trajet.setLngArrivee(request.getLngArrivee());
    trajet.setDateHeure(request.getDateHeure());
    trajet.setNbPlacesTotal(newTotal);
    trajet.setNbPlacesDispo(newTotal - reserved);
    trajet.setPrixParPlace(request.getPrixParPlace());
    trajet.setAccepteColis(Boolean.TRUE.equals(request.getAccepteColis()));
    trajet.setAutoriseArrets(Boolean.TRUE.equals(request.getAutoriseArrets()));
    trajet.getArrets().clear();
    if (request.getArrets() != null) {
      List<ArretRequest> arrets = request.getArrets() == null ? List.of() : request.getArrets();
    for (ArretRequest arretRequest : arrets) {
        ArretIntermediaire arret = ArretIntermediaire.builder()
            .trajet(trajet)
            .ville(arretRequest.getVille())
            .latitude(arretRequest.getLatitude())
            .longitude(arretRequest.getLongitude())
            .ordre(arretRequest.getOrdre())
            .heurePassage(arretRequest.getHeurePassage())
            .build();
        trajet.getArrets().add(arret);
      }
    }
    return toResponse(trajetRepository.save(trajet));
  }

  @Transactional
  public TrajetResponse demarrerTrajet(Long id) {
    Trajet trajet = ownedTrajet(id);
    trajet.setStatut(StatutTrajet.EN_COURS);
    return toResponse(trajetRepository.save(trajet));
  }

  @Transactional
  public TrajetResponse terminerTrajet(Long id) {
    Trajet trajet = ownedTrajet(id);
    trajet.setStatut(StatutTrajet.TERMINE);
    List<Reservation> reservations = reservationRepository.findConfirmedByTrajetId(id);
    reservations.forEach(r -> notificationService.sendToUser(r.getPassager().getFcmToken(), "Trajet terminé", "Merci de noter votre trajet CityShare."));
    return toResponse(trajetRepository.save(trajet));
  }

  @Transactional
  public void delete(Long id) {
    Trajet trajet = ownedTrajet(id);
    trajetRepository.delete(trajet);
  }

  public Trajet find(Long id) {
    return trajetRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Trajet introuvable"));
  }

  public TrajetResponse toResponse(Trajet trajet) {
    return TrajetResponse.builder()
        .id(trajet.getId())
        .conducteur(authService.toUserResponse(trajet.getConducteur()))
        .villeDepart(trajet.getVilleDepart())
        .villeArrivee(trajet.getVilleArrivee())
        .dateHeure(trajet.getDateHeure())
        .nbPlacesDispo(trajet.getNbPlacesDispo())
        .prixParPlace(trajet.getPrixParPlace())
        .accepteColis(trajet.getAccepteColis())
        .statut(trajet.getStatut())
        .arrets(trajet.getArrets())
        .build();
  }

  private Trajet ownedTrajet(Long id) {
    Trajet trajet = find(id);
    if (!trajet.getConducteur().getId().equals(authService.currentUser().getId())) {
      throw new UnauthorizedException("Vous ne pouvez modifier que vos trajets");
    }
    return trajet;
  }

  private Conducteur requireConducteur() {
    if (authService.currentUser() instanceof Conducteur conducteur) return conducteur;
    throw new UnauthorizedException("Accès réservé aux conducteurs");
  }
}
