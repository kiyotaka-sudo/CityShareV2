package cm.mboaride.service.paiement;

import cm.mboaride.dto.PaiementDtos.*;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.service.*;
import cm.mboaride.util.Codes;
import cm.mboaride.util.Montants;
import cm.mboaride.util.Telephones;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Paiements des courses et règlement des chauffeurs (section 5.8) :
 * espèces, MTN MoMo, Orange Money via l'agrégateur choisi par l'administrateur (Monetbil ou CamPay), portefeuille.
 */
@Slf4j
@Service
public class PaiementService {
  private final Map<FournisseurPaiement, FournisseurPaiementClient> clients;
  private final PaiementRepository paiementRepository;
  private final CourseRepository courseRepository;
  private final RetraitRepository retraitRepository;
  private final UtilisateurRepository utilisateurRepository;
  private final PortefeuilleService portefeuille;
  private final ParametreService parametres;
  private final NotificationService notifications;
  private final RealtimeService realtime;
  private final CurrentUser currentUser;

  public PaiementService(List<FournisseurPaiementClient> clients, PaiementRepository paiementRepository,
      CourseRepository courseRepository, RetraitRepository retraitRepository, UtilisateurRepository utilisateurRepository,
      PortefeuilleService portefeuille, ParametreService parametres, NotificationService notifications,
      RealtimeService realtime, CurrentUser currentUser) {
    this.clients = clients.stream().collect(Collectors.toMap(FournisseurPaiementClient::type, Function.identity()));
    this.paiementRepository = paiementRepository;
    this.courseRepository = courseRepository;
    this.retraitRepository = retraitRepository;
    this.utilisateurRepository = utilisateurRepository;
    this.portefeuille = portefeuille;
    this.parametres = parametres;
    this.notifications = notifications;
    this.realtime = realtime;
    this.currentUser = currentUser;
  }

  // ------------------------------------------------------------------ fournisseur actif

  /** Agrégateur sélectionné dans le back-office ; repli sur la simulation s'il n'est pas configuré. */
  public FournisseurPaiementClient fournisseurActif() {
    FournisseurPaiement choisi = FournisseurPaiement.valueOf(parametres.texte(ParametreService.FOURNISSEUR_PAIEMENT));
    FournisseurPaiementClient client = clients.get(choisi);
    if (client == null || !client.configure()) {
      if (choisi != FournisseurPaiement.SIMULATION) {
        log.warn("Fournisseur {} non configuré : paiement simulé", choisi);
      }
      return clients.get(FournisseurPaiement.SIMULATION);
    }
    return client;
  }

  public Map<String, Object> etatFournisseurs() {
    return Map.of(
        "actif", parametres.texte(ParametreService.FOURNISSEUR_PAIEMENT),
        "effectif", fournisseurActif().type().name(),
        "monetbilConfigure", clients.get(FournisseurPaiement.MONETBIL).configure(),
        "campayConfigure", clients.get(FournisseurPaiement.CAMPAY).configure());
  }

  // ------------------------------------------------------------------ commission

  /** Commission plateforme : pourcentage en dépôt et moto, frais fixes par place en ramassage (BF-40). */
  public static long commission(TypeService type, long prixFinal, int nbPlaces, double pourcentage, long fraisFixeParPlace) {
    if (type == TypeService.RAMASSAGE) {
      return Math.min(prixFinal, fraisFixeParPlace * Math.max(1, nbPlaces));
    }
    return Montants.arrondir25(prixFinal * pourcentage / 100.0);
  }

  // ------------------------------------------------------------------ règlement en fin de course

  /** Appelé à la fin de la course : calcule la commission et déclenche le paiement selon le mode choisi. */
  @Transactional
  public void reglerFinDeCourse(Course c) {
    long com = commission(c.getTypeService(), c.getPrixFinal(), c.getNbPlaces(),
        parametres.decimal(ParametreService.COMMISSION_PCT), parametres.entier(ParametreService.FRAIS_FIXE_RAMASSAGE));
    c.setCommission(com);
    c.setGainChauffeur(c.getPrixFinal() - com);
    switch (c.getModePaiement()) {
      case ESPECES -> reglerEspeces(c);
      case PORTEFEUILLE -> {
        portefeuille.mouvement(c.getClient().getId(), TypeTransaction.PAIEMENT_COURSE, -c.getMontantAPayer(), c,
            "Course " + c.getReference(), true);
        portefeuille.mouvement(c.getChauffeur().getId(), TypeTransaction.GAIN_COURSE, c.getGainChauffeur(), c,
            "Course " + c.getReference(), true);
        c.setStatutPaiement(StatutPaiementCourse.PAYE);
        notifications.notifier(c.getChauffeur().getId(), "paiement_recu", c.getId(), false, c.getGainChauffeur());
      }
      case MTN_MOMO, ORANGE_MONEY -> {
        if (c.getMontantAPayer() == 0) {
          crediterChauffeur(c);
        } else {
          try {
            lancerPaiementCourse(c, c.getModePaiement(), c.getClient().getTelephone());
          } catch (RuntimeException ex) {
            log.warn("Paiement Mobile Money non initié pour {} : {}", c.getReference(), ex.getMessage());
            c.setStatutPaiement(StatutPaiementCourse.ECHEC);
          }
        }
      }
    }
  }

  /**
   * Espèces : le chauffeur encaisse le montant ; la commission est déduite de son portefeuille (BF-42).
   * Une éventuelle réduction promotionnelle lui est remboursée par la plateforme.
   */
  private void reglerEspeces(Course c) {
    portefeuille.mouvement(c.getChauffeur().getId(), TypeTransaction.COMMISSION, -c.getCommission(), c,
        "Commission course " + c.getReference() + " (espèces)", true);
    if (c.getReduction() > 0) {
      portefeuille.mouvement(c.getChauffeur().getId(), TypeTransaction.REMBOURSEMENT, c.getReduction(), c,
          "Réduction client prise en charge par MboaRide", true);
    }
    c.setStatutPaiement(StatutPaiementCourse.PAYE);
  }

  private void crediterChauffeur(Course c) {
    portefeuille.mouvement(c.getChauffeur().getId(), TypeTransaction.GAIN_COURSE, c.getGainChauffeur(), c,
        "Course " + c.getReference() + " (Mobile Money)", true);
    c.setStatutPaiement(StatutPaiementCourse.PAYE);
    notifications.notifier(c.getChauffeur().getId(), "paiement_recu", c.getId(), true, c.getGainChauffeur());
    notifications.notifier(c.getClient().getId(), "paiement_confirme", c.getId(), true, c.getMontantAPayer());
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "PAIEMENT", Map.of("courseId", c.getId(), "statut", "PAYE"));
    realtime.envoyer(c.getChauffeur().getId(), RealtimeService.FILE_DEMANDES, "PAIEMENT", Map.of("courseId", c.getId(), "statut", "PAYE"));
  }

  private Paiement lancerPaiementCourse(Course c, ModePaiement mode, String telephone) {
    FournisseurPaiementClient fournisseur = fournisseurActif();
    Paiement p = Paiement.builder().course(c).utilisateur(c.getClient()).type(TypePaiement.COURSE)
        .montant(c.getMontantAPayer()).mode(mode).fournisseur(fournisseur.type())
        .reference("PAY-" + c.getId() + "-" + Codes.alphanum(6)).telephone(Telephones.normaliser(telephone)).build();
    fournisseur.initier(p);
    c.setStatutPaiement(StatutPaiementCourse.EN_ATTENTE);
    p = paiementRepository.save(p);
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "PAIEMENT_DEMANDE", toDto(p));
    notifications.notifier(c.getClient().getId(), "paiement_demande", c.getId(), false, c.getMontantAPayer());
    return p;
  }

  // ------------------------------------------------------------------ actions du client

  /** Relance (ou change d'opérateur) le paiement Mobile Money d'une course terminée. */
  @Transactional
  public PaiementDto payerCourse(Long courseId, InitPaiement req) {
    Course c = courseClient(courseId);
    if (c.getStatut() != StatutCourse.TERMINEE || c.getStatutPaiement() == StatutPaiementCourse.PAYE) {
      throw ApiException.badRequest("paiement.non_requis");
    }
    ModePaiement mode = req.mode() != null ? ModePaiement.valueOf(req.mode()) : c.getModePaiement();
    if (mode != ModePaiement.MTN_MOMO && mode != ModePaiement.ORANGE_MONEY) {
      throw ApiException.badRequest("paiement.mode_invalide");
    }
    c.setModePaiement(mode);
    String tel = req.telephone() == null || req.telephone().isBlank() ? c.getClient().getTelephone() : req.telephone();
    try {
      return toDto(lancerPaiementCourse(c, mode, tel));
    } catch (ApiException ex) {
      throw ex;
    } catch (RuntimeException ex) {
      log.warn("Échec d'initiation du paiement : {}", ex.getMessage());
      throw ApiException.badRequest("paiement.initiation_echec");
    }
  }

  /** Le client décide de régler en espèces après un échec Mobile Money ; le chauffeur doit confirmer. */
  @Transactional
  public void basculerEspeces(Long courseId) {
    Course c = courseClient(courseId);
    if (c.getStatut() != StatutCourse.TERMINEE || c.getStatutPaiement() == StatutPaiementCourse.PAYE) {
      throw ApiException.badRequest("paiement.non_requis");
    }
    c.setModePaiement(ModePaiement.ESPECES);
    c.setStatutPaiement(StatutPaiementCourse.EN_ATTENTE);
    notifications.notifier(c.getChauffeur().getId(), "especes_a_encaisser", c.getId(), true, c.getMontantAPayer());
    realtime.envoyer(c.getChauffeur().getId(), RealtimeService.FILE_DEMANDES, "ESPECES_A_ENCAISSER", Map.of("courseId", c.getId()));
  }

  /** Le chauffeur confirme avoir reçu les espèces. */
  @Transactional
  public void especesRecues(Long courseId) {
    Course c = courseRepository.findById(courseId).filter(x -> x.getChauffeur() != null && x.getChauffeur().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
    if (c.getModePaiement() != ModePaiement.ESPECES || c.getStatutPaiement() == StatutPaiementCourse.PAYE) {
      throw ApiException.badRequest("paiement.non_requis");
    }
    reglerEspeces(c);
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "PAIEMENT", Map.of("courseId", c.getId(), "statut", "PAYE"));
  }

  @Transactional
  public PaiementDto recharger(Recharge req) {
    Utilisateur u = currentUser.get();
    FournisseurPaiementClient fournisseur = fournisseurActif();
    String tel = req.telephone() == null || req.telephone().isBlank() ? u.getTelephone() : req.telephone();
    Paiement p = Paiement.builder().utilisateur(u).type(TypePaiement.RECHARGE).montant(req.montant())
        .mode(ModePaiement.valueOf(req.mode())).fournisseur(fournisseur.type())
        .reference("RCH-" + u.getId() + "-" + Codes.alphanum(6)).telephone(Telephones.normaliser(tel)).build();
    try {
      fournisseur.initier(p);
    } catch (RuntimeException ex) {
      log.warn("Recharge non initiée : {}", ex.getMessage());
      throw ApiException.badRequest("paiement.initiation_echec");
    }
    return toDto(paiementRepository.save(p));
  }

  /** Suivi d'un paiement par l'application (interroge l'agrégateur si besoin : fonctionne sans webhook public). */
  @Transactional
  public PaiementDto statut(Long paiementId) {
    Paiement p = paiementRepository.findById(paiementId)
        .filter(x -> x.getUtilisateur().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("paiement.introuvable"));
    actualiser(p);
    return toDto(p);
  }

  @Transactional(readOnly = true)
  public PaiementDto dernierPaiementCourse(Long courseId) {
    courseClient(courseId);
    return paiementRepository.findTopByCourseIdOrderByCreatedAtDesc(courseId).map(PaiementService::toDto)
        .orElseThrow(() -> ApiException.notFound("paiement.introuvable"));
  }

  // ------------------------------------------------------------------ confirmation

  @Transactional
  public void actualiser(Paiement p) {
    if (p.getStatut() != StatutPaiement.EN_ATTENTE) {
      return;
    }
    StatutPaiement statut;
    try {
      statut = clients.get(p.getFournisseur()).verifier(p);
    } catch (RuntimeException ex) {
      log.debug("Vérification impossible pour {} : {}", p.getReference(), ex.getMessage());
      return;
    }
    if (statut == StatutPaiement.EN_ATTENTE && p.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(30))) {
      statut = StatutPaiement.ECHOUE;
      p.setMessage("Délai de confirmation dépassé");
    }
    appliquer(p, statut);
  }

  private void appliquer(Paiement p, StatutPaiement statut) {
    if (statut == StatutPaiement.EN_ATTENTE || p.getStatut() != StatutPaiement.EN_ATTENTE) {
      return;
    }
    p.setStatut(statut);
    p.setUpdatedAt(LocalDateTime.now());
    if (p.getType() == TypePaiement.RECHARGE) {
      if (statut == StatutPaiement.REUSSI) {
        portefeuille.mouvement(p.getUtilisateur().getId(), TypeTransaction.RECHARGE, p.getMontant(), null,
            "Recharge " + p.getMode(), false);
        notifications.notifier(p.getUtilisateur().getId(), "recharge_ok", null, false, p.getMontant());
      }
      return;
    }
    Course c = p.getCourse();
    if (statut == StatutPaiement.REUSSI) {
      if (c.getStatutPaiement() != StatutPaiementCourse.PAYE) {
        crediterChauffeur(c);
      }
    } else if (c.getStatutPaiement() != StatutPaiementCourse.PAYE) {
      c.setStatutPaiement(StatutPaiementCourse.ECHEC);
      notifications.notifier(c.getClient().getId(), "paiement_echec", c.getId(), true, c.getMontantAPayer());
      realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "PAIEMENT", Map.of("courseId", c.getId(), "statut", "ECHEC"));
    }
  }

  /** Notification Monetbil : on ne fait pas confiance au contenu, on revérifie auprès de l'API. */
  @Transactional
  public void webhookMonetbil(Map<String, String> params) {
    String ref = params.get("payment_ref");
    if (ref == null) {
      return;
    }
    paiementRepository.findByReference(ref).ifPresent(p -> {
      String transactionId = params.getOrDefault("transaction_id", params.get("paymentId"));
      if (transactionId != null) {
        p.setReferenceExterne(transactionId);
      }
      actualiser(p);
    });
  }

  @Transactional
  public void webhookCampay(Map<String, String> params) {
    String externe = params.get("external_reference");
    String reference = params.get("reference");
    var paiement = externe != null ? paiementRepository.findByReference(externe) : paiementRepository.findByReferenceExterne(reference);
    paiement.ifPresent(p -> {
      if (p.getReferenceExterne() == null && reference != null) {
        p.setReferenceExterne(reference);
      }
      actualiser(p);
    });
  }

  /** Relève les paiements en attente (filet de sécurité si le webhook n'arrive pas). */
  @Transactional
  public void verifierPaiementsEnAttente() {
    paiementRepository.findByStatutAndCreatedAtBefore(StatutPaiement.EN_ATTENTE, LocalDateTime.now().minusSeconds(5))
        .forEach(this::actualiser);
  }

  // ------------------------------------------------------------------ retraits (BF-41)

  @Transactional
  public RetraitDto demanderRetrait(DemandeRetrait req) {
    Utilisateur chauffeur = currentUser.get();
    if (chauffeur.getRole() != Role.CHAUFFEUR && chauffeur.getRole() != Role.PROPRIETAIRE) {
      throw ApiException.forbidden("erreur.acces");
    }
    portefeuille.mouvement(chauffeur.getId(), TypeTransaction.RETRAIT, -req.montant(), null,
        "Retrait vers " + req.operateur(), false);
    FournisseurPaiementClient fournisseur = fournisseurActif();
    Retrait r = Retrait.builder().chauffeur(chauffeur).montant(req.montant())
        .telephone(Telephones.normaliser(req.telephone())).operateur(req.operateur())
        .fournisseur(fournisseur.type()).reference("RET-" + chauffeur.getId() + "-" + Codes.alphanum(6)).build();
    r = retraitRepository.save(r);
    if (fournisseur.supporteRetrait()) {
      try {
        StatutPaiement s = fournisseur.retirer(r);
        appliquerRetrait(r, s);
      } catch (RuntimeException ex) {
        log.warn("Retrait automatique impossible, traitement manuel : {}", ex.getMessage());
        r.setMessage("En attente de traitement par l'administration");
      }
    } else {
      r.setMessage("En attente de traitement par l'administration");
    }
    return toDto(r);
  }

  @Transactional(readOnly = true)
  public List<RetraitDto> mesRetraits() {
    return retraitRepository.findByChauffeurIdOrderByCreatedAtDesc(currentUser.id()).stream().map(PaiementService::toDto).toList();
  }

  /** Traitement manuel par l'administrateur (agrégateur sans API de retrait). */
  @Transactional
  public RetraitDto traiterRetrait(Long id, boolean effectue, String message) {
    Retrait r = retraitRepository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    if (r.getStatut() != StatutRetrait.EN_ATTENTE) {
      throw ApiException.badRequest("retrait.deja_traite");
    }
    r.setTraitePar(currentUser.id());
    r.setMessage(message);
    appliquerRetrait(r, effectue ? StatutPaiement.REUSSI : StatutPaiement.ECHOUE);
    if (!effectue) {
      r.setStatut(StatutRetrait.REJETE);
    }
    return toDto(r);
  }

  @Transactional
  public void verifierRetraitsEnAttente() {
    retraitRepository.findAll().stream()
        .filter(r -> r.getStatut() == StatutRetrait.EN_ATTENTE && r.getReferenceExterne() != null)
        .forEach(r -> {
          FournisseurPaiementClient f = clients.get(r.getFournisseur());
          try {
            appliquerRetrait(r, f.verifierRetrait(r));
          } catch (RuntimeException ex) {
            log.debug("Vérification du retrait {} impossible : {}", r.getReference(), ex.getMessage());
          }
        });
  }

  private void appliquerRetrait(Retrait r, StatutPaiement s) {
    if (s == StatutPaiement.EN_ATTENTE) {
      return;
    }
    r.setTraiteAt(LocalDateTime.now());
    if (s == StatutPaiement.REUSSI) {
      r.setStatut(StatutRetrait.EFFECTUE);
      notifications.notifier(r.getChauffeur().getId(), "retrait_ok", null, true, r.getMontant());
    } else {
      r.setStatut(StatutRetrait.ECHOUE);
      portefeuille.mouvement(r.getChauffeur().getId(), TypeTransaction.REMBOURSEMENT, r.getMontant(), null,
          "Retrait " + r.getReference() + " non abouti", false);
      notifications.notifier(r.getChauffeur().getId(), "retrait_echec", null, true, r.getMontant());
    }
  }

  // ------------------------------------------------------------------ utilitaires

  private Course courseClient(Long courseId) {
    return courseRepository.findById(courseId).filter(c -> c.getClient().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
  }

  public static PaiementDto toDto(Paiement p) {
    return new PaiementDto(p.getId(), p.getReference(), p.getType(), p.getCourse() == null ? null : p.getCourse().getId(),
        p.getMontant(), p.getMode(), p.getFournisseur(), p.getStatut(), p.getPaymentUrl(), p.getMessage(), p.getCreatedAt());
  }

  public static RetraitDto toDto(Retrait r) {
    return new RetraitDto(r.getId(), r.getChauffeur().getId(), r.getChauffeur().getNomComplet(), r.getMontant(),
        r.getTelephone(), r.getOperateur(), r.getFournisseur(), r.getStatut(), r.getReference(), r.getMessage(),
        r.getCreatedAt(), r.getTraiteAt());
  }
}
