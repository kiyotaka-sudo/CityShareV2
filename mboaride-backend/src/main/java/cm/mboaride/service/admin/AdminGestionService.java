package cm.mboaride.service.admin;

import cm.mboaride.dto.AdminDtos.*;
import cm.mboaride.dto.PaiementDtos.PaiementDto;
import cm.mboaride.dto.PaiementDtos.RetraitDto;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.service.*;
import cm.mboaride.service.paiement.PaiementService;
import cm.mboaride.util.Telephones;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Utilisateurs et droits (BF-62), tarifs et zones (BF-60), promotions et campagnes (BF-63), supervision. */
@Service
@RequiredArgsConstructor
public class AdminGestionService {
  private final UtilisateurRepository utilisateurRepository;
  private final CourseRepository courseRepository;
  private final TarifRepository tarifRepository;
  private final ZoneRepository zoneRepository;
  private final CodePromoRepository promoRepository;
  private final CampagneNotificationRepository campagneRepository;
  private final JournalAdminRepository journalRepository;
  private final PaiementRepository paiementRepository;
  private final RetraitRepository retraitRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final ParametreService parametres;
  private final JournalService journal;
  private final NotificationService notifications;
  private final ProfilService profilService;
  private final PasswordEncoder passwordEncoder;
  private final CurrentUser currentUser;

  // ------------------------------------------------------------------ utilisateurs (BF-62)

  @Transactional(readOnly = true)
  public List<UtilisateurAdminDto> utilisateurs(Role role, StatutCompte statut, String q) {
    Specification<Utilisateur> spec = (root, query, cb) -> {
      List<Predicate> p = new ArrayList<>();
      if (role != null) p.add(cb.equal(root.get("role"), role));
      if (statut != null) p.add(cb.equal(root.get("statut"), statut));
      if (q != null && !q.isBlank()) {
        String like = "%" + q.trim().toLowerCase() + "%";
        p.add(cb.or(cb.like(cb.lower(root.get("nom")), like), cb.like(cb.lower(root.get("prenom")), like),
            cb.like(root.get("telephone"), "%" + q.trim() + "%"), cb.like(cb.lower(root.get("email")), like)));
      }
      return cb.and(p.toArray(Predicate[]::new));
    };
    return utilisateurRepository.findAll(spec, PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "dateInscription")))
        .map(u -> new UtilisateurAdminDto(u.getId(), u.getNom(), u.getPrenom(), u.getTelephone(), u.getEmail(), u.getRole(),
            u.getStatut(), u.getNoteMoyenne(), u.getNbNotes(), u.getSolde(), u.getDateInscription(), u.getDerniereConnexion(),
            u.getRole() == Role.CHAUFFEUR ? 0 : courseRepository.countByClientIdAndStatut(u.getId(), StatutCourse.TERMINEE)))
        .getContent();
  }

  @Transactional
  public void changerStatutUtilisateur(Long id, ChangementStatut req) {
    Utilisateur u = utilisateurRepository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    if (u.getId().equals(currentUser.id())) {
      throw ApiException.badRequest("admin.soi_meme");
    }
    if (req.statut() == StatutCompte.SUPPRIME) {
      profilService.anonymiser(u);
    } else if (req.statut() == StatutCompte.ACTIF || req.statut() == StatutCompte.SUSPENDU) {
      if (u.getRole() == Role.CHAUFFEUR && req.statut() == StatutCompte.ACTIF && !profilService.documentsAJour(id)) {
        throw ApiException.badRequest("chauffeur.documents_invalides");
      }
      u.setStatut(req.statut());
      if (req.statut() == StatutCompte.SUSPENDU) {
        chauffeurRepository.findById(id).ifPresent(ch -> ch.setDisponible(false));
      }
    } else {
      throw ApiException.badRequest("statut.invalide");
    }
    journal.tracer("STATUT_UTILISATEUR", "UTILISATEUR", id, req.statut() + (req.motif() == null ? "" : " : " + req.motif()));
  }

  /** Création d'un compte du personnel (administrateur ou agent du support). */
  @Transactional
  public UtilisateurAdminDto creerPersonnel(CreationPersonnel req) {
    if (req.role() != Role.ADMIN && req.role() != Role.SUPPORT) {
      throw ApiException.badRequest("admin.role_invalide");
    }
    String tel = Telephones.normaliser(req.telephone());
    if (utilisateurRepository.existsByTelephone(tel)) {
      throw ApiException.conflict("chauffeur.telephone_utilise");
    }
    if (utilisateurRepository.findByEmailIgnoreCase(req.email()).isPresent()) {
      throw ApiException.conflict("profil.email_utilise");
    }
    Utilisateur u = utilisateurRepository.save(Utilisateur.builder().nom(req.nom().trim()).prenom(req.prenom().trim())
        .telephone(tel).email(req.email().trim().toLowerCase()).motDePasse(passwordEncoder.encode(req.motDePasse()))
        .role(req.role()).statut(StatutCompte.ACTIF).consentementAt(LocalDateTime.now()).build());
    journal.tracer("CREATION_PERSONNEL", "UTILISATEUR", u.getId(), req.role() + " " + u.getEmail());
    return new UtilisateurAdminDto(u.getId(), u.getNom(), u.getPrenom(), u.getTelephone(), u.getEmail(), u.getRole(),
        u.getStatut(), 0.0, 0, 0L, u.getDateInscription(), null, 0);
  }

  @Transactional
  public void changerMotDePasse(String actuel, String nouveau) {
    Utilisateur u = currentUser.get();
    if (nouveau == null || nouveau.length() < 8) {
      throw ApiException.badRequest("admin.mot_de_passe_court");
    }
    if (u.getMotDePasse() == null || !passwordEncoder.matches(actuel, u.getMotDePasse())) {
      throw ApiException.badRequest("auth.identifiants");
    }
    u.setMotDePasse(passwordEncoder.encode(nouveau));
    journal.tracer("CHANGEMENT_MOT_DE_PASSE", "UTILISATEUR", u.getId(), null);
  }

  // ------------------------------------------------------------------ tarifs et paramètres (BF-25, BF-60)

  @Transactional(readOnly = true)
  public List<TarifDto> tarifs() {
    return tarifRepository.findAll().stream().map(AdminGestionService::tarifDto).toList();
  }

  @Transactional
  public TarifDto modifierTarif(Long id, TarifDto req) {
    Tarif t = tarifRepository.findById(id).orElseThrow(() -> ApiException.notFound("tarif.introuvable"));
    String avant = tarifDto(t).toString();
    t.setPriseEnCharge(req.priseEnCharge());
    t.setPrixKm(req.prixKm());
    t.setPrixMinute(req.prixMinute());
    t.setPrixMinimum(req.prixMinimum());
    t.setPrixPlace(req.prixPlace());
    t.setDistanceIncluseKm(req.distanceIncluseKm());
    t.setSupplementKm(req.supplementKm());
    t.setUpdatedAt(LocalDateTime.now());
    journal.tracer("MODIFICATION_TARIF", "TARIF", id, "Avant : " + avant);
    return tarifDto(t);
  }

  static TarifDto tarifDto(Tarif t) {
    return new TarifDto(t.getId(), t.getTypeService(), t.getPriseEnCharge(), t.getPrixKm(), t.getPrixMinute(),
        t.getPrixMinimum(), t.getPrixPlace(), t.getDistanceIncluseKm(), t.getSupplementKm(), t.getUpdatedAt());
  }

  public List<ParametreDto> parametres() {
    return parametres.tous().stream().map(p -> new ParametreDto(p.getCle(), p.getValeur(), p.getDescription(), p.getUpdatedAt())).toList();
  }

  public ParametreDto modifierParametre(String cle, String valeur) {
    String avant = parametres.texte(cle);
    Parametre p = parametres.modifier(cle, valeur);
    journal.tracer("MODIFICATION_PARAMETRE", "PARAMETRE", null, cle + " : " + avant + " → " + p.getValeur());
    return new ParametreDto(p.getCle(), p.getValeur(), p.getDescription(), p.getUpdatedAt());
  }

  // ------------------------------------------------------------------ zones (BF-31, BF-60)

  @Transactional(readOnly = true)
  public List<ZoneDto> zones() {
    return zoneRepository.findAll().stream().map(AdminGestionService::zoneDto).toList();
  }

  @Transactional
  public ZoneDto enregistrerZone(Long id, ZoneDto req) {
    Zone z = id == null ? new Zone() : zoneRepository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    z.setNom(req.nom().trim());
    z.setVille(req.ville().trim());
    z.setCentreLat(req.centreLat());
    z.setCentreLng(req.centreLng());
    z.setRayonKm(req.rayonKm());
    z.setMajorationPct(req.majorationPct());
    z.setMotoActive(req.motoActive());
    z.setMotoInterditDebut(req.motoInterditDebut());
    z.setMotoInterditFin(req.motoInterditFin());
    z.setActive(req.active());
    z = zoneRepository.save(z);
    journal.tracer(id == null ? "CREATION_ZONE" : "MODIFICATION_ZONE", "ZONE", z.getId(), z.getNom());
    return zoneDto(z);
  }

  @Transactional
  public void supprimerZone(Long id) {
    Zone z = zoneRepository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    z.setActive(false); // conservée pour l'historique des courses
    journal.tracer("DESACTIVATION_ZONE", "ZONE", id, z.getNom());
  }

  static ZoneDto zoneDto(Zone z) {
    return new ZoneDto(z.getId(), z.getNom(), z.getVille(), z.getCentreLat(), z.getCentreLng(), z.getRayonKm(),
        z.getMajorationPct(), z.getMotoActive(), z.getMotoInterditDebut(), z.getMotoInterditFin(), z.getActive());
  }

  // ------------------------------------------------------------------ codes promo (BF-63)

  @Transactional(readOnly = true)
  public List<CodePromoDto> promos() {
    return promoRepository.findAllByOrderByCreatedAtDesc().stream().map(AdminGestionService::promoDto).toList();
  }

  @Transactional
  public CodePromoDto enregistrerPromo(Long id, CodePromoDto req) {
    String code = req.code().trim().toUpperCase();
    promoRepository.findByCodeIgnoreCase(code).filter(p -> !p.getId().equals(id))
        .ifPresent(p -> { throw ApiException.conflict("promo.code_existant"); });
    if (req.typeReduction() == TypeReduction.POURCENTAGE && req.valeur() > 100) {
      throw ApiException.badRequest("promo.pourcentage_invalide");
    }
    CodePromo p = id == null ? new CodePromo() : promoRepository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    p.setCode(code);
    p.setDescription(req.description());
    p.setTypeReduction(req.typeReduction());
    p.setValeur(req.valeur());
    p.setReductionMax(req.reductionMax());
    p.setDateDebut(req.dateDebut());
    p.setDateFin(req.dateFin());
    p.setUtilisationsMax(req.utilisationsMax());
    p.setUneFoisParUtilisateur(req.uneFoisParUtilisateur());
    p.setActif(req.actif());
    if (p.getUtilisations() == null) p.setUtilisations(0);
    if (p.getCreatedAt() == null) p.setCreatedAt(LocalDateTime.now());
    p = promoRepository.save(p);
    journal.tracer(id == null ? "CREATION_PROMO" : "MODIFICATION_PROMO", "PROMO", p.getId(), code);
    return promoDto(p);
  }

  static CodePromoDto promoDto(CodePromo p) {
    return new CodePromoDto(p.getId(), p.getCode(), p.getDescription(), p.getTypeReduction(), p.getValeur(), p.getReductionMax(),
        p.getDateDebut(), p.getDateFin(), p.getUtilisationsMax(), p.getUtilisations(), p.getUneFoisParUtilisateur(), p.getActif());
  }

  // ------------------------------------------------------------------ campagnes de notification (BF-63)

  @Transactional(readOnly = true)
  public List<CampagneDto> campagnes() {
    return campagneRepository.findAllByOrderByCreatedAtDesc().stream().map(c -> new CampagneDto(c.getId(), c.getTitre(),
        c.getMessage(), c.getCible(), c.getAvecSms(), c.getNbDestinataires(), c.getCreatedAt())).toList();
  }

  @Transactional
  public CampagneDto lancerCampagne(CampagneRequest req) {
    List<Role> roles = switch (req.cible()) {
      case CLIENTS -> List.of(Role.CLIENT);
      case CHAUFFEURS -> List.of(Role.CHAUFFEUR, Role.PROPRIETAIRE);
      case TOUS -> List.of(Role.CLIENT, Role.CHAUFFEUR, Role.PROPRIETAIRE);
    };
    List<Utilisateur> destinataires = utilisateurRepository.findByRoleInAndStatut(roles, StatutCompte.ACTIF);
    CampagneNotification c = campagneRepository.save(CampagneNotification.builder().titre(req.titre()).message(req.message())
        .cible(req.cible()).avecSms(Boolean.TRUE.equals(req.avecSms())).nbDestinataires(destinataires.size())
        .envoyePar(currentUser.id()).build());
    notifications.envoyerCampagne(destinataires.stream().map(Utilisateur::getId).toList(), req.titre(), req.message(),
        Boolean.TRUE.equals(req.avecSms()));
    journal.tracer("CAMPAGNE_NOTIFICATION", "CAMPAGNE", c.getId(), req.cible() + " — " + destinataires.size() + " destinataires");
    return new CampagneDto(c.getId(), c.getTitre(), c.getMessage(), c.getCible(), c.getAvecSms(), c.getNbDestinataires(), c.getCreatedAt());
  }

  // ------------------------------------------------------------------ supervision

  @Transactional(readOnly = true)
  public List<CourseAdminDto> courses(StatutCourse statut, TypeService type, LocalDate du, LocalDate au, String q) {
    return coursesFiltrees(statut, type, du, au, q, 500).stream().map(AdminGestionService::courseDto).toList();
  }

  public List<Course> coursesFiltrees(StatutCourse statut, TypeService type, LocalDate du, LocalDate au, String q, int max) {
    Specification<Course> spec = (root, query, cb) -> {
      List<Predicate> p = new ArrayList<>();
      if (statut != null) p.add(cb.equal(root.get("statut"), statut));
      if (type != null) p.add(cb.equal(root.get("typeService"), type));
      if (du != null) p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), du.atStartOfDay()));
      if (au != null) p.add(cb.lessThan(root.get("createdAt"), au.plusDays(1).atStartOfDay()));
      if (q != null && !q.isBlank()) {
        String like = "%" + q.trim().toLowerCase() + "%";
        p.add(cb.or(cb.like(cb.lower(root.get("reference")), like), cb.like(cb.lower(root.get("departAdresse")), like),
            cb.like(cb.lower(root.get("arriveeAdresse")), like)));
      }
      return cb.and(p.toArray(Predicate[]::new));
    };
    return courseRepository.findAll(spec, PageRequest.of(0, max, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
  }

  public static CourseAdminDto courseDto(Course c) {
    Utilisateur ch = c.getChauffeur();
    return new CourseAdminDto(c.getId(), c.getReference(), c.getTypeService(), c.getStatut(), c.getClient().getNomComplet(),
        c.getClient().getTelephone(), ch == null ? null : ch.getNomComplet(), ch == null ? null : ch.getTelephone(),
        c.getVehicule() == null ? null : c.getVehicule().getImmatriculation(), c.getDepartAdresse(), c.getArriveeAdresse(),
        Math.round(c.getDistanceKm() * 10) / 10.0, c.getPrixReference(), c.getPrixFinal(), c.getMontantAPayer(), c.getCommission(),
        c.getModePaiement(), c.getStatutPaiement(), c.getCreatedAt(), c.getFinAt(), c.getAnnuleePar());
  }

  @Transactional(readOnly = true)
  public List<PaiementDto> paiements() {
    return paiementRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 500)).map(PaiementService::toDto).getContent();
  }

  @Transactional(readOnly = true)
  public List<RetraitDto> retraits() {
    return retraitRepository.findAllWithChauffeur().stream().map(PaiementService::toDto).toList();
  }

  @Transactional(readOnly = true)
  public List<JournalDto> journal(int page) {
    return journalRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, 200)).map(j -> new JournalDto(j.getId(),
        j.getAdminNom(), j.getAction(), j.getCibleType(), j.getCibleId(), j.getDetails(), j.getIp(), j.getCreatedAt())).getContent();
  }

  public static final EnumSet<StatutCourse> TOUS_STATUTS = EnumSet.allOf(StatutCourse.class);
}
