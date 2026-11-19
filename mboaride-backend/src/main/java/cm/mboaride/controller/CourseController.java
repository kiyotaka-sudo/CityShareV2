package cm.mboaride.controller;

import cm.mboaride.dto.CourseDtos.*;
import cm.mboaride.dto.PaiementDtos.InitPaiement;
import cm.mboaride.dto.PaiementDtos.PaiementDto;
import cm.mboaride.dto.SupportDtos.PartageDto;
import cm.mboaride.service.*;
import cm.mboaride.service.paiement.PaiementService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Parcours client : estimation, demande, négociation, suivi, paiement, notation, reçu. */
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
  private final CourseService courseService;
  private final MessagerieService messagerie;
  private final SecuriteService securite;
  private final PaiementService paiementService;
  private final DocumentPdfService pdfService;

  @PostMapping("/estimation")
  public EstimationReponse estimer(@Valid @RequestBody EstimationRequest req) {
    return courseService.estimer(req);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CourseDto demander(@Valid @RequestBody DemandeCourse req) {
    return courseService.demander(req);
  }

  @GetMapping("/active")
  public ResponseEntity<CourseDto> active() {
    return courseService.courseActive().map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
  }

  @GetMapping
  public List<CourseDto> historique(@RequestParam(defaultValue = "0") int page) {
    return courseService.historique(page);
  }

  @GetMapping("/{id}")
  public CourseDto detail(@PathVariable Long id) {
    return courseService.detail(id);
  }

  @GetMapping("/{id}/offres")
  public List<OffreDto> offres(@PathVariable Long id) {
    return courseService.offres(id);
  }

  @PostMapping("/{id}/offres/{offreId}/choisir")
  public CourseDto choisir(@PathVariable Long id, @PathVariable Long offreId) {
    return courseService.choisirOffre(id, offreId);
  }

  @PostMapping("/{id}/annuler")
  public CourseDto annuler(@PathVariable Long id, @Valid @RequestBody(required = false) Annulation req) {
    return courseService.annulerParClient(id, req == null ? null : req.motif());
  }

  @PostMapping("/{id}/noter")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void noter(@PathVariable Long id, @Valid @RequestBody NotationRequest req) {
    courseService.noter(id, req);
  }

  @GetMapping("/{id}/messages")
  public List<MessageDto> messages(@PathVariable Long id) {
    return messagerie.messages(id);
  }

  @PostMapping("/{id}/messages")
  public MessageDto envoyer(@PathVariable Long id, @Valid @RequestBody EnvoiMessage req) {
    return messagerie.envoyer(id, req.contenu());
  }

  @GetMapping("/{id}/partage")
  public PartageDto partage(@PathVariable Long id) {
    return securite.partager(id);
  }

  @GetMapping("/{id}/recu")
  public Map<String, String> recu(@PathVariable Long id) {
    return pdfService.lienRecu(id);
  }

  @GetMapping("/{id}/paiement")
  public PaiementDto paiement(@PathVariable Long id) {
    return paiementService.dernierPaiementCourse(id);
  }

  @PostMapping("/{id}/payer")
  public PaiementDto payer(@PathVariable Long id, @Valid @RequestBody InitPaiement req) {
    return paiementService.payerCourse(id, req);
  }

  @PostMapping("/{id}/payer-especes")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void payerEspeces(@PathVariable Long id) {
    paiementService.basculerEspeces(id);
  }
}
