package cm.cityshare.service;

import cm.cityshare.dto.request.ColisRequest;
import cm.cityshare.dto.response.ColisResponse;
import cm.cityshare.entity.Colis;
import cm.cityshare.entity.Conducteur;
import cm.cityshare.entity.Expediteur;
import cm.cityshare.entity.Trajet;
import cm.cityshare.enums.StatutColis;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.exception.UnauthorizedException;
import cm.cityshare.repository.ColisRepository;
import cm.cityshare.repository.ConducteurRepository;
import cm.cityshare.repository.TrajetRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ColisService {
  private final ColisRepository colisRepository;
  private final ConducteurRepository conducteurRepository;
  private final TrajetRepository trajetRepository;
  private final AuthService authService;
  private final TrajetService trajetService;

  @Transactional
  public ColisResponse create(ColisRequest request) {
    if (!(authService.currentUser() instanceof Expediteur expediteur)) {
      throw new UnauthorizedException("Accès réservé aux expéditeurs");
    }
    Conducteur conducteur = request.getConducteurId() == null ? null : conducteurRepository.findById(request.getConducteurId()).orElse(null);
    Trajet trajet = request.getTrajetId() == null ? null : trajetRepository.findById(request.getTrajetId()).orElse(null);
    Colis colis = Colis.builder()
        .expediteur(expediteur)
        .conducteur(conducteur)
        .trajet(trajet)
        .description(request.getDescription())
        .poids(request.getPoids())
        .villeDepart(request.getVilleDepart())
        .villeArrivee(request.getVilleArrivee())
        .latDepart(request.getLatDepart())
        .lngDepart(request.getLngDepart())
        .latArrivee(request.getLatArrivee())
        .lngArrivee(request.getLngArrivee())
        .prixLivraison(request.getPrixLivraison() == null ? 0.0 : request.getPrixLivraison())
        .statut(StatutColis.EN_ATTENTE)
        .build();
    return toResponse(colisRepository.save(colis));
  }

  public List<?> match(String depart, String arrivee, String poids) {
    return trajetRepository.findAllActifs().stream()
        .filter(Trajet::getAccepteColis)
        .filter(t -> depart == null || t.getVilleDepart().toLowerCase().contains(depart.toLowerCase()))
        .filter(t -> arrivee == null || t.getVilleArrivee().toLowerCase().contains(arrivee.toLowerCase()))
        .filter(t -> poids == null || poids.isBlank() || t.getAccepteColis())
        .map(trajetService::toResponse)
        .toList();
  }

  public List<ColisResponse> mine() {
    return colisRepository.findByExpediteurId(authService.currentUser().getId()).stream().map(this::toResponse).toList();
  }

  @Transactional
  public ColisResponse accepter(Long id) {
    if (!(authService.currentUser() instanceof Conducteur conducteur)) throw new UnauthorizedException("Accès réservé aux conducteurs");
    Colis colis = find(id);
    colis.setConducteur(conducteur);
    colis.setStatut(StatutColis.ACCEPTE);
    return toResponse(colisRepository.save(colis));
  }

  @Transactional
  public ColisResponse updateStatut(Long id, StatutColis statut) {
    Colis colis = find(id);
    colis.setStatut(statut);
    return toResponse(colisRepository.save(colis));
  }

  private Colis find(Long id) {
    return colisRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Colis introuvable"));
  }

  public ColisResponse toResponse(Colis colis) {
    return ColisResponse.builder()
        .id(colis.getId())
        .expediteur(authService.toUserResponse(colis.getExpediteur()))
        .conducteur(colis.getConducteur() == null ? null : authService.toUserResponse(colis.getConducteur()))
        .trajet(colis.getTrajet() == null ? null : trajetService.toResponse(colis.getTrajet()))
        .description(colis.getDescription())
        .poids(colis.getPoids())
        .villeDepart(colis.getVilleDepart())
        .villeArrivee(colis.getVilleArrivee())
        .prixLivraison(colis.getPrixLivraison())
        .statut(colis.getStatut())
        .build();
  }
}
