package cm.mboaride.controller;

import cm.mboaride.dto.CourseDtos.ItineraireDto;
import cm.mboaride.dto.PaiementDtos.*;
import cm.mboaride.dto.SupportDtos.*;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.service.*;
import cm.mboaride.service.carto.RoutageService;
import cm.mboaride.service.carto.VehiculesProchesService;
import cm.mboaride.service.paiement.PaiementService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Portefeuille, SOS, réclamations, repères et itinéraires. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DiversController {
  private final PortefeuilleService portefeuille;
  private final PaiementService paiementService;
  private final SecuriteService securite;
  private final ReclamationService reclamations;
  private final RepereService reperes;
  private final RoutageService routage;
  private final VehiculesProchesService vehiculesProches;
  private final CurrentUser currentUser;

  // ---------------------------------------------------------------- portefeuille

  @GetMapping("/portefeuille")
  public PortefeuilleDto portefeuille(@RequestParam(defaultValue = "0") int page) {
    return portefeuille.consulter(currentUser.id(), page);
  }

  @PostMapping("/portefeuille/recharge")
  public PaiementDto recharger(@Valid @RequestBody Recharge req) {
    return paiementService.recharger(req);
  }

  @GetMapping("/paiements/{id}")
  public PaiementDto paiement(@PathVariable Long id) {
    return paiementService.statut(id);
  }

  // ---------------------------------------------------------------- sécurité (BF-43)

  @PostMapping("/sos")
  @ResponseStatus(HttpStatus.CREATED)
  public AlerteDto sos(@RequestBody SosRequest req) {
    return securite.declencherSos(req);
  }

  @PutMapping("/sos/{id}/position")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void sosPosition(@PathVariable Long id, @RequestBody SosRequest req) {
    if (req.lat() != null && req.lng() != null) {
      securite.majPositionSos(id, req.lat(), req.lng());
    }
  }

  // ---------------------------------------------------------------- réclamations (BF-51, BF-52)

  @GetMapping("/reclamations")
  public List<ReclamationDto> mesReclamations() {
    return reclamations.mesReclamations();
  }

  @PostMapping("/reclamations")
  @ResponseStatus(HttpStatus.CREATED)
  public ReclamationDto reclamer(@Valid @RequestBody ReclamationRequest req) {
    return reclamations.creer(req);
  }

  // ---------------------------------------------------------------- repères (BF-33, BF-34)

  @GetMapping("/reperes")
  public List<RepereDto> reperes(@RequestParam(required = false) String q, @RequestParam(required = false) String ville,
      @RequestParam(required = false) Double lat, @RequestParam(required = false) Double lng) {
    return reperes.rechercher(q, ville, lat, lng);
  }

  @PostMapping("/reperes")
  @ResponseStatus(HttpStatus.CREATED)
  public RepereDto proposerRepere(@Valid @RequestBody PropositionRepere req) {
    return reperes.proposer(req);
  }

  // ---------------------------------------------------------------- cartographie

  /** Véhicules disponibles autour d'un point (positions anonymisées) pour la carte animée de l'accueil. */
  @GetMapping("/carte/vehicules-proches")
  public List<VehiculesProchesService.VehiculeProche> vehiculesProches(@RequestParam double lat, @RequestParam double lng) {
    return vehiculesProches.autour(lat, lng);
  }

  @GetMapping("/carte/itineraire")
  public ItineraireDto itineraire(@RequestParam double deLat, @RequestParam double deLng,
      @RequestParam double versLat, @RequestParam double versLng) {
    var it = routage.trace(deLat, deLng, versLat, versLng);
    return new ItineraireDto(Math.round(it.distanceKm() * 10) / 10.0, Math.ceil(it.dureeMin()), it.estime(), it.trace());
  }
}
