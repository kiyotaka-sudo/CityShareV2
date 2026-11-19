package cm.mboaride.controller.admin;

import cm.mboaride.dto.AdminDtos.*;
import cm.mboaride.dto.ChauffeurDtos;
import cm.mboaride.dto.CourseDtos.CourseDto;
import cm.mboaride.dto.CreationChauffeurForm;
import cm.mboaride.dto.PaiementDtos.PaiementDto;
import cm.mboaride.dto.PaiementDtos.RetraitDto;
import cm.mboaride.dto.SupportDtos.*;
import cm.mboaride.dto.UserDtos.UtilisateurDto;
import cm.mboaride.dto.UserDtos.VehiculeDto;
import cm.mboaride.entity.DocumentChauffeur;
import cm.mboaride.enums.*;
import cm.mboaride.service.*;
import cm.mboaride.service.admin.*;
import cm.mboaride.service.paiement.PaiementService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * API du back-office (section 5.12). Les agents du support n'accèdent qu'aux alertes SOS, aux réclamations,
 * au tableau de bord et à la consultation des courses (BF-61, BF-62).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
  private final TableauDeBordService tableauDeBord;
  private final AdminChauffeurService chauffeurs;
  private final AdminGestionService gestion;
  private final ExportService exports;
  private final SecuriteService securite;
  private final ReclamationService reclamations;
  private final RepereService reperes;
  private final PaiementService paiementService;
  private final ProfilService profilService;
  private final CourseService courseService;

  // ---------------------------------------------------------------- accès commun admin / support

  @GetMapping("/moi")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public UtilisateurDto moi() {
    return profilService.moi();
  }

  @PutMapping("/moi/mot-de-passe")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void motDePasse(@RequestBody Map<String, String> req) {
    gestion.changerMotDePasse(req.get("actuel"), req.get("nouveau"));
  }

  @GetMapping("/tableau-de-bord")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public TableauDeBord tableauDeBord() {
    return tableauDeBord.calculer();
  }

  @GetMapping("/alertes")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public List<AlerteDto> alertes() {
    return securite.alertes();
  }

  @PutMapping("/alertes/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public AlerteDto traiterAlerte(@PathVariable Long id, @Valid @RequestBody Traitement req) {
    return securite.traiter(id, StatutAlerte.valueOf(req.statut()), req.commentaire());
  }

  @GetMapping("/reclamations")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public List<ReclamationDto> reclamations() {
    return reclamations.toutes();
  }

  @PutMapping("/reclamations/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public ReclamationDto traiterReclamation(@PathVariable Long id, @Valid @RequestBody Traitement req) {
    return reclamations.traiter(id, StatutReclamation.valueOf(req.statut()), req.commentaire());
  }

  @GetMapping("/courses")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public List<CourseAdminDto> courses(@RequestParam(required = false) StatutCourse statut,
      @RequestParam(required = false) TypeService type,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
      @RequestParam(required = false) String q) {
    return gestion.courses(statut, type, du, au, q);
  }

  @GetMapping("/courses/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
  public CourseDto course(@PathVariable Long id) {
    return courseService.detail(id);
  }

  // ---------------------------------------------------------------- chauffeurs (BF-03, BF-04, BF-59)

  @GetMapping("/chauffeurs")
  public List<ChauffeurAdminDto> chauffeurs() {
    return chauffeurs.liste();
  }

  @GetMapping("/chauffeurs/{id}")
  public ChauffeurAdminDto chauffeur(@PathVariable Long id) {
    return chauffeurs.detail(id);
  }

  @PostMapping(value = "/chauffeurs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public ChauffeurAdminDto creerChauffeur(@Valid @ModelAttribute CreationChauffeurForm form) {
    return chauffeurs.creer(form);
  }

  @PostMapping(value = "/chauffeurs/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ChauffeurAdminDto ajouterDocument(@PathVariable Long id, @RequestParam TypeDocument type,
      @RequestParam("fichier") MultipartFile fichier,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateExpiration) {
    return chauffeurs.ajouterPiece(id, type, fichier, dateExpiration);
  }

  @PutMapping("/documents/{id}")
  public ChauffeurAdminDto deciderDocument(@PathVariable Long id, @Valid @RequestBody DecisionDocument req) {
    return chauffeurs.deciderDocument(id, req);
  }

  @GetMapping("/documents/{id}/fichier")
  public ResponseEntity<Resource> fichierDocument(@PathVariable Long id) {
    DocumentChauffeur d = chauffeurs.document(id);
    Resource r = chauffeurs.fichier(d);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + d.getType().name().toLowerCase() + "\"")
        .header(HttpHeaders.CACHE_CONTROL, "no-store")
        .contentType(d.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(d.getContentType()))
        .body(r);
  }

  @PutMapping("/chauffeurs/{id}/statut")
  public ChauffeurAdminDto statutChauffeur(@PathVariable Long id, @Valid @RequestBody ChangementStatut req) {
    return chauffeurs.changerStatut(id, req);
  }

  @PutMapping("/chauffeurs/{id}/vehicule")
  public ChauffeurAdminDto affecter(@PathVariable Long id, @RequestBody AffectationVehicule req) {
    return chauffeurs.affecterVehicule(id, req.vehiculeId());
  }

  @GetMapping("/vehicules")
  public List<VehiculeDto> vehicules() {
    return chauffeurs.vehicules();
  }

  @PostMapping("/vehicules")
  @ResponseStatus(HttpStatus.CREATED)
  public VehiculeDto creerVehicule(@Valid @RequestBody CreationVehicule req) {
    return chauffeurs.creerVehicule(req);
  }

  @PutMapping("/vehicules/{id}/actif")
  public VehiculeDto activerVehicule(@PathVariable Long id, @RequestParam boolean actif) {
    return chauffeurs.activerVehicule(id, actif);
  }

  @PostMapping("/proprietaires")
  @ResponseStatus(HttpStatus.CREATED)
  public UtilisateurAdminDto creerProprietaire(@Valid @RequestBody CreationProprietaire req) {
    return chauffeurs.creerProprietaire(req);
  }

  // ---------------------------------------------------------------- utilisateurs et droits (BF-62)

  @GetMapping("/utilisateurs")
  public List<UtilisateurAdminDto> utilisateurs(@RequestParam(required = false) Role role,
      @RequestParam(required = false) StatutCompte statut, @RequestParam(required = false) String q) {
    return gestion.utilisateurs(role, statut, q);
  }

  @PutMapping("/utilisateurs/{id}/statut")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void statutUtilisateur(@PathVariable Long id, @Valid @RequestBody ChangementStatut req) {
    gestion.changerStatutUtilisateur(id, req);
  }

  @PostMapping("/personnel")
  @ResponseStatus(HttpStatus.CREATED)
  public UtilisateurAdminDto creerPersonnel(@Valid @RequestBody CreationPersonnel req) {
    return gestion.creerPersonnel(req);
  }

  // ---------------------------------------------------------------- tarification (BF-25, BF-60)

  @GetMapping("/tarifs")
  public List<TarifDto> tarifs() {
    return gestion.tarifs();
  }

  @PutMapping("/tarifs/{id}")
  public TarifDto modifierTarif(@PathVariable Long id, @Valid @RequestBody TarifDto req) {
    return gestion.modifierTarif(id, req);
  }

  @GetMapping("/parametres")
  public List<ParametreDto> parametres() {
    return gestion.parametres();
  }

  @PutMapping("/parametres/{cle}")
  public ParametreDto modifierParametre(@PathVariable String cle, @Valid @RequestBody ParametreUpdate req) {
    return gestion.modifierParametre(cle, req.valeur());
  }

  @GetMapping("/paiement/fournisseurs")
  public Map<String, Object> fournisseurs() {
    return paiementService.etatFournisseurs();
  }

  @GetMapping("/zones")
  public List<ZoneDto> zones() {
    return gestion.zones();
  }

  @PostMapping("/zones")
  @ResponseStatus(HttpStatus.CREATED)
  public ZoneDto creerZone(@Valid @RequestBody ZoneDto req) {
    return gestion.enregistrerZone(null, req);
  }

  @PutMapping("/zones/{id}")
  public ZoneDto modifierZone(@PathVariable Long id, @Valid @RequestBody ZoneDto req) {
    return gestion.enregistrerZone(id, req);
  }

  @DeleteMapping("/zones/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void supprimerZone(@PathVariable Long id) {
    gestion.supprimerZone(id);
  }

  // ---------------------------------------------------------------- repères (BF-34)

  @GetMapping("/reperes")
  public List<RepereDto> reperes() {
    return reperes.tous();
  }

  @PostMapping("/reperes")
  @ResponseStatus(HttpStatus.CREATED)
  public RepereDto creerRepere(@Valid @RequestBody PropositionRepere req) {
    return reperes.enregistrer(null, req, StatutRepere.VALIDE);
  }

  @PutMapping("/reperes/{id}")
  public RepereDto modifierRepere(@PathVariable Long id, @Valid @RequestBody PropositionRepere req) {
    return reperes.enregistrer(id, req, StatutRepere.VALIDE);
  }

  @PutMapping("/reperes/{id}/statut")
  public RepereDto statutRepere(@PathVariable Long id, @RequestParam StatutRepere statut) {
    return reperes.changerStatut(id, statut);
  }

  @DeleteMapping("/reperes/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void supprimerRepere(@PathVariable Long id) {
    reperes.supprimer(id);
  }

  // ---------------------------------------------------------------- paiements et retraits

  @GetMapping("/paiements")
  public List<PaiementDto> paiements() {
    return gestion.paiements();
  }

  @GetMapping("/retraits")
  public List<RetraitDto> retraits() {
    return gestion.retraits();
  }

  @PutMapping("/retraits/{id}")
  public RetraitDto traiterRetrait(@PathVariable Long id, @Valid @RequestBody TraitementRetrait req) {
    return paiementService.traiterRetrait(id, req.effectue(), req.message());
  }

  // ---------------------------------------------------------------- promotions et campagnes (BF-63)

  @GetMapping("/promos")
  public List<CodePromoDto> promos() {
    return gestion.promos();
  }

  @PostMapping("/promos")
  @ResponseStatus(HttpStatus.CREATED)
  public CodePromoDto creerPromo(@Valid @RequestBody CodePromoDto req) {
    return gestion.enregistrerPromo(null, req);
  }

  @PutMapping("/promos/{id}")
  public CodePromoDto modifierPromo(@PathVariable Long id, @Valid @RequestBody CodePromoDto req) {
    return gestion.enregistrerPromo(id, req);
  }

  @GetMapping("/campagnes")
  public List<CampagneDto> campagnes() {
    return gestion.campagnes();
  }

  @PostMapping("/campagnes")
  @ResponseStatus(HttpStatus.CREATED)
  public CampagneDto lancerCampagne(@Valid @RequestBody CampagneRequest req) {
    return gestion.lancerCampagne(req);
  }

  // ---------------------------------------------------------------- journal et exports (BNF-06, BF-64)

  @GetMapping("/journal")
  public List<JournalDto> journal(@RequestParam(defaultValue = "0") int page) {
    return gestion.journal(page);
  }

  @GetMapping("/exports/{rapport}")
  public ResponseEntity<byte[]> exporter(@PathVariable String rapport, @RequestParam(defaultValue = "xlsx") String format,
      @RequestParam(required = false) StatutCourse statut, @RequestParam(required = false) TypeService type,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au) {
    ExportService.Fichier f = exports.exporter(rapport, format, statut, type, du, au);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + f.nom())
        .contentType(MediaType.parseMediaType(f.contentType())).body(f.contenu());
  }
}
