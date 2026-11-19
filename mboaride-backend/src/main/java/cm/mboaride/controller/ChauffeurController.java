package cm.mboaride.controller;

import cm.mboaride.dto.ChauffeurDtos.*;
import cm.mboaride.dto.CourseDtos.*;
import cm.mboaride.dto.PaiementDtos.DemandeRetrait;
import cm.mboaride.dto.PaiementDtos.RetraitDto;
import cm.mboaride.dto.UserDtos.UtilisateurDto;
import cm.mboaride.service.ChauffeurService;
import cm.mboaride.service.CourseService;
import cm.mboaride.service.paiement.PaiementService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Espace chauffeur (section 5.11) et propriétaire (BF-57). */
@RestController
@RequestMapping("/api/chauffeur")
@RequiredArgsConstructor
public class ChauffeurController {
  private final ChauffeurService chauffeurService;
  private final CourseService courseService;
  private final PaiementService paiementService;

  @PutMapping("/disponibilite")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public UtilisateurDto disponibilite(@Valid @RequestBody Disponibilite req) {
    return chauffeurService.disponibilite(req);
  }

  @PutMapping("/ramassage")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public UtilisateurDto ramassage(@Valid @RequestBody ModeRamassage req) {
    return chauffeurService.modeRamassage(req);
  }

  @PutMapping("/places")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public UtilisateurDto places(@Valid @RequestBody Places req) {
    return chauffeurService.ajusterPlaces(req.placesLibres());
  }

  @PutMapping("/casque")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public UtilisateurDto casque(@Valid @RequestBody Casque req) {
    return chauffeurService.casque(req.disponible());
  }

  @PostMapping("/position")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void position(@Valid @RequestBody PositionDto req) {
    courseService.majPosition(req);
  }

  @GetMapping("/demandes")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public List<DemandeChauffeurDto> demandes() {
    return chauffeurService.demandes();
  }

  @PostMapping("/demandes/{courseId}/repondre")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public OffreDto repondre(@PathVariable Long courseId, @Valid @RequestBody ReponseChauffeur req) {
    return courseService.repondre(courseId, req);
  }

  @PostMapping("/demandes/{courseId}/ignorer")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void ignorer(@PathVariable Long courseId) {
    courseService.ignorer(courseId);
  }

  @GetMapping("/courses/actives")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public List<CourseDto> coursesActives() {
    return courseService.coursesActivesChauffeur();
  }

  @PostMapping("/courses/{id}/arrivee")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public CourseDto arrivee(@PathVariable Long id) {
    return courseService.signalerArrivee(id);
  }

  @PostMapping("/courses/{id}/demarrer")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public CourseDto demarrer(@PathVariable Long id, @Valid @RequestBody Demarrage req) {
    return courseService.demarrer(id, req.code());
  }

  @PostMapping("/courses/{id}/terminer")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public CourseDto terminer(@PathVariable Long id) {
    return courseService.terminer(id);
  }

  @PostMapping("/courses/{id}/annuler")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void annuler(@PathVariable Long id, @Valid @RequestBody(required = false) Annulation req) {
    courseService.annulerParChauffeur(id, req == null ? null : req.motif());
  }

  @PostMapping("/courses/{id}/especes-recues")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void especesRecues(@PathVariable Long id) {
    paiementService.especesRecues(id);
  }

  @GetMapping("/courses/{id}/itineraire")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public ItineraireDto itineraire(@PathVariable Long id) {
    return courseService.itineraire(id);
  }

  @GetMapping("/gains")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public Gains gains() {
    return chauffeurService.gains();
  }

  @GetMapping("/zones-demande")
  public List<PointChaud> zonesDemande() {
    return chauffeurService.zonesDemande();
  }

  @GetMapping("/documents")
  @PreAuthorize("hasRole('CHAUFFEUR')")
  public List<DocumentDto> documents() {
    return chauffeurService.documents();
  }

  @GetMapping("/flotte")
  public Flotte flotte() {
    return chauffeurService.flotte();
  }

  @PostMapping("/retraits")
  public RetraitDto retrait(@Valid @RequestBody DemandeRetrait req) {
    return paiementService.demanderRetrait(req);
  }

  @GetMapping("/retraits")
  public List<RetraitDto> retraits() {
    return paiementService.mesRetraits();
  }
}
