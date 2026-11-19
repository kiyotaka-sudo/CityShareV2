package cm.mboaride.service;

import cm.mboaride.dto.CourseDtos.*;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.security.AuthUser;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.service.TarificationService.Contexte;
import cm.mboaride.service.carto.RoutageService;
import cm.mboaride.service.paiement.PaiementService;
import cm.mboaride.util.Codes;
import cm.mboaride.util.Geo;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Réservation et déroulement d'une course : estimation (BF-09), demande (BF-07/08), négociation encadrée (5.5),
 * choix de l'offre, arrivée, code de vérification (BF-45), fin, annulation (BF-13), suivi temps réel (BF-32).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseService {
  static final EnumSet<StatutCourse> EN_COURS_CLIENT = EnumSet.of(StatutCourse.RECHERCHE, StatutCourse.ACCEPTEE,
      StatutCourse.CHAUFFEUR_ARRIVE, StatutCourse.EN_COURS);
  static final EnumSet<StatutCourse> ACTIVES = DispatchService.STATUTS_ACTIFS;

  private final CourseRepository courseRepository;
  private final OffreRepository offreRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final UtilisateurRepository utilisateurRepository;
  private final CourseIgnoreeRepository ignoreeRepository;
  private final CoursePositionRepository positionRepository;
  private final NotationRepository notationRepository;
  private final TarificationService tarification;
  private final RoutageService routage;
  private final ZoneService zoneService;
  private final DispatchService dispatch;
  private final PositionService positions;
  private final ParametreService parametres;
  private final PromoService promoService;
  private final PortefeuilleService portefeuille;
  private final PaiementService paiementService;
  private final NotificationService notifications;
  private final RealtimeService realtime;
  private final JournalService journal;
  private final CourseMapper mapper;
  private final CurrentUser currentUser;

  // ================================================================== estimation (BF-09, BNF-01)

  @Transactional(readOnly = true)
  public EstimationReponse estimer(EstimationRequest req) {
    Utilisateur client = currentUser.get();
    var itineraire = routage.calculer(req.depart().lat(), req.depart().lng(), req.arrivee().lat(), req.arrivee().lng());
    int nbPlaces = req.nbPlaces() == null ? 1 : req.nbPlaces();
    Contexte ctx = contexte(req.depart().lat(), req.depart().lng());
    String messagePromo = null;
    List<EstimationService> services = new ArrayList<>();
    for (TypeService type : TypeService.values()) {
      TypeVehicule vehicule = type == TypeService.MOTO ? TypeVehicule.MOTO : TypeVehicule.TAXI;
      int proches = dispatch.chauffeursProches(req.depart().lat(), req.depart().lng(), vehicule);
      TarificationService.Prix brut = tarification.calculer(type, itineraire.distanceKm(), itineraire.dureeMin(),
          type == TypeService.RAMASSAGE ? nbPlaces : 1, ctx);
      long reduction = 0;
      try {
        reduction = promoService.calculer(client, req.codePromo(), brut.prixReference()).montant();
      } catch (ApiException ex) {
        messagePromo = ex.getCode();
      }
      services.add(tarification.estimation(type, itineraire.distanceKm(), itineraire.dureeMin(),
          type == TypeService.DEPOT ? Math.min(nbPlaces, 4) : nbPlaces, ctx, reduction, proches));
    }
    String zone = zoneService.zonePrincipale(req.depart().lat(), req.depart().lng()).map(Zone::getNom).orElse(null);
    return new EstimationReponse(CourseMapper.arrondi(itineraire.distanceKm()), Math.ceil(itineraire.dureeMin()),
        itineraire.estime(), zone, services, messagePromo);
  }

  private Contexte contexte(double lat, double lng) {
    return new Contexte(lat, lng, LocalTime.now(), dispatch.demandesProches(lat, lng),
        dispatch.chauffeursProches(lat, lng, TypeVehicule.TAXI) + dispatch.chauffeursProches(lat, lng, TypeVehicule.MOTO));
  }

  // ================================================================== demande de course

  @Transactional
  public CourseDto demander(DemandeCourse req) {
    Utilisateur client = currentUser.get();
    if (client.getStatut() != StatutCompte.ACTIF) {
      throw ApiException.forbidden("compte.suspendu");
    }
    if (!courseRepository.findByClientIdAndStatutIn(client.getId(), EN_COURS_CLIENT).isEmpty()) {
      throw ApiException.conflict("course.deja_en_cours");
    }
    TypeService type = req.typeService();
    int nbPlaces = req.nbPlaces() == null ? 1 : req.nbPlaces();
    if (type == TypeService.MOTO && nbPlaces != 1) {
      throw ApiException.badRequest("moto.un_passager"); // BF-28
    }
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime planifiee = req.datePlanifiee();
    if (planifiee != null) {
      if (planifiee.isBefore(now.plusMinutes(30)) || planifiee.isAfter(now.plusDays(7))) {
        throw ApiException.badRequest("course.planification_invalide");
      }
    }
    LocalTime heure = planifiee != null ? planifiee.toLocalTime() : LocalTime.now();
    zoneService.motifIndisponibilite(type, req.depart().lat(), req.depart().lng(), heure)
        .ifPresent(motif -> { throw ApiException.badRequest(motif); });
    if (Geo.distanceKm(req.depart().lat(), req.depart().lng(), req.arrivee().lat(), req.arrivee().lng()) < 0.2) {
      throw ApiException.badRequest("course.trop_courte");
    }

    var itineraire = routage.calculer(req.depart().lat(), req.depart().lng(), req.arrivee().lat(), req.arrivee().lng());
    double duree = type == TypeService.MOTO ? itineraire.dureeMin() * 0.8 : itineraire.dureeMin();
    Contexte ctx = new Contexte(req.depart().lat(), req.depart().lng(), heure,
        dispatch.demandesProches(req.depart().lat(), req.depart().lng()),
        dispatch.chauffeursProches(req.depart().lat(), req.depart().lng(), type == TypeService.MOTO ? TypeVehicule.MOTO : TypeVehicule.TAXI));
    TarificationService.Prix prix = tarification.calculer(type, itineraire.distanceKm(), duree,
        type == TypeService.RAMASSAGE ? nbPlaces : 1, ctx);

    long propose = prix.prixReference();
    if (type != TypeService.RAMASSAGE && req.prixPropose() != null) {
      if (!TarificationService.dansFourchette(req.prixPropose(), prix.prixMin(), prix.prixMax())) {
        throw ApiException.badRequest("prix.hors_fourchette", prix.prixMin(), prix.prixMax()); // BF-23
      }
      propose = req.prixPropose();
    }
    PromoService.Reduction reduction = promoService.calculer(client, req.codePromo(), propose);
    if (req.modePaiement() == ModePaiement.PORTEFEUILLE && client.getSolde() < propose - reduction.montant()) {
      throw ApiException.badRequest("portefeuille.solde_insuffisant", client.getSolde());
    }

    Course course = Course.builder()
        .reference("MR-" + Codes.alphanum(7))
        .client(client)
        .typeService(type)
        .statut(planifiee != null ? StatutCourse.PLANIFIEE : StatutCourse.RECHERCHE)
        .nbPlaces(nbPlaces)
        .departAdresse(req.depart().adresse())
        .departRepere(req.depart().repere())
        .departLat(req.depart().lat())
        .departLng(req.depart().lng())
        .arriveeAdresse(req.arrivee().adresse())
        .arriveeLat(req.arrivee().lat())
        .arriveeLng(req.arrivee().lng())
        .distanceKm(itineraire.distanceKm())
        .dureeMin(duree)
        .prixReference(prix.prixReference())
        .prixMin(prix.prixMin())
        .prixMax(prix.prixMax())
        .prixPropose(propose)
        .reduction(reduction.montant())
        .codePromo(reduction.code())
        .majorations(prix.majorations().stream().map(m -> m.libelle() + " +" + Math.round(m.pct()) + "%")
            .collect(Collectors.joining(", ")))
        .modePaiement(req.modePaiement())
        .mboaLady(Boolean.TRUE.equals(req.mboaLady()))
        .codeVerification(Codes.chiffres(4))
        .tokenPartage(Codes.token())
        .zone(zoneService.zonePrincipale(req.depart().lat(), req.depart().lng()).orElse(null))
        .datePlanifiee(planifiee)
        .build();
    if (planifiee == null) {
      course.setOffresExpireAt(now.plusSeconds(parametres.entier(ParametreService.DELAI_OFFRES)));
    }
    course = courseRepository.save(course);
    if (planifiee == null) {
      int sollicites = dispatch.solliciter(course);
      log.info("Course {} : {} chauffeur(s) sollicité(s)", course.getReference(), sollicites);
    }
    return mapper.toDto(course, client.getId(), client.getRole());
  }

  /** Lance une course planifiée à l'approche de l'heure prévue (BF-14). */
  @Transactional
  public void lancerPlanifiee(Course course) {
    if (course.getStatut() != StatutCourse.PLANIFIEE) {
      return;
    }
    course.setStatut(StatutCourse.RECHERCHE);
    course.setOffresExpireAt(LocalDateTime.now().plusSeconds(parametres.entier(ParametreService.DELAI_OFFRES)));
    dispatch.solliciter(course);
    notifications.notifier(course.getClient().getId(), "planifiee_lancee", course.getId(), true, course.getArriveeAdresse());
    realtime.envoyer(course.getClient().getId(), RealtimeService.FILE_COURSES, "STATUT", statut(course));
  }

  // ================================================================== négociation (section 5.5)

  @Transactional(readOnly = true)
  public List<OffreDto> offres(Long courseId) {
    Course c = courseDuClient(courseId);
    return offreRepository.findEnAttente(c.getId(), c.getTourNegociation()).stream().map(o -> offreDto(o, c)).toList();
  }

  /** Réponse d'un chauffeur : acceptation au prix proposé ou contre-proposition unique dans la fourchette (BF-24). */
  @Transactional
  public OffreDto repondre(Long courseId, ReponseChauffeur req) {
    Chauffeur ch = chauffeurConnecte();
    Course c = courseRepository.findById(courseId).orElseThrow(() -> ApiException.notFound("course.introuvable"));
    if (c.getStatut() != StatutCourse.RECHERCHE) {
      throw ApiException.conflict("course.plus_disponible");
    }
    if (!ch.getDisponible() || !dispatch.compatible(ch, c)) {
      throw ApiException.badRequest("course.non_compatible");
    }
    if (offreRepository.existsByCourseIdAndChauffeurIdAndTour(c.getId(), ch.getId(), c.getTourNegociation())) {
      throw ApiException.conflict("offre.deja_envoyee");
    }
    if (c.getTypeService() == TypeService.MOTO && !Boolean.TRUE.equals(req.casqueConfirme())) {
      throw ApiException.badRequest("moto.casque_requis"); // BF-29
    }
    long prix = c.getPrixPropose();
    if (req.type() == TypeOffre.CONTRE_PROPOSITION) {
      if (c.getTypeService() == TypeService.RAMASSAGE) {
        throw ApiException.badRequest("ramassage.prix_fixe");
      }
      if (req.prix() == null || !TarificationService.dansFourchette(req.prix(), c.getPrixMin(), c.getPrixMax())) {
        throw ApiException.badRequest("prix.hors_fourchette", c.getPrixMin(), c.getPrixMax());
      }
      prix = req.prix();
    }
    double distance = positions.position(ch).map(p -> Geo.distanceKm(p.lat(), p.lng(), c.getDepartLat(), c.getDepartLng())).orElse(0.0);
    Offre offre = offreRepository.save(Offre.builder().course(c).chauffeur(ch.getUtilisateur()).tour(c.getTourNegociation())
        .prix(prix).type(req.type()).distancePriseEnChargeKm(distance).build());

    // Ramassage : tarif fixe, le premier chauffeur qui accepte est retenu
    if (c.getTypeService() == TypeService.RAMASSAGE) {
      assigner(c, offre, ch);
      return offreDto(offre, c);
    }
    OffreDto dto = offreDto(offre, c);
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "NOUVELLE_OFFRE", dto);
    notifications.notifier(c.getClient().getId(), "nouvelle_offre", c.getId(), false, ch.getUtilisateur().getPrenom(), prix);
    return dto;
  }

  @Transactional
  public void ignorer(Long courseId) {
    Long chauffeurId = currentUser.id();
    ignoreeRepository.save(new CourseIgnoree(courseId, chauffeurId));
  }

  /** Le client retient une offre : le prix devient définitif (BF-26). */
  @Transactional
  public CourseDto choisirOffre(Long courseId, Long offreId) {
    Course c = courseDuClient(courseId);
    if (c.getStatut() != StatutCourse.RECHERCHE) {
      throw ApiException.conflict("course.plus_disponible");
    }
    Offre offre = offreRepository.findById(offreId)
        .filter(o -> o.getCourse().getId().equals(c.getId()) && o.getTour().equals(c.getTourNegociation())
            && o.getStatut() == StatutOffre.EN_ATTENTE)
        .orElseThrow(() -> ApiException.notFound("offre.introuvable"));
    Chauffeur ch = chauffeurRepository.findById(offre.getChauffeur().getId()).orElseThrow();
    if (!ch.getDisponible() || !dispatch.compatible(ch, c)) {
      offre.setStatut(StatutOffre.EXPIREE);
      throw ApiException.conflict("offre.chauffeur_indisponible");
    }
    if (c.getModePaiement() == ModePaiement.PORTEFEUILLE && c.getClient().getSolde() < offre.getPrix() - c.getReduction()) {
      throw ApiException.badRequest("portefeuille.solde_insuffisant", c.getClient().getSolde());
    }
    assigner(c, offre, ch);
    return mapper.toDto(c, c.getClient().getId(), Role.CLIENT);
  }

  private void assigner(Course c, Offre offre, Chauffeur ch) {
    offre.setStatut(StatutOffre.CHOISIE);
    c.setChauffeur(ch.getUtilisateur());
    c.setVehicule(ch.getVehicule());
    c.setPrixFinal(offre.getPrix());
    c.setReduction(Math.min(c.getReduction(), offre.getPrix()));
    c.setCasqueConfirme(c.getTypeService() == TypeService.MOTO);
    c.setStatut(StatutCourse.ACCEPTEE);
    c.setAccepteeAt(LocalDateTime.now());
    c.setOffresExpireAt(null);
    if (c.getTypeService() == TypeService.RAMASSAGE) {
      ch.setPlacesLibres(Math.max(0, ch.getPlacesLibres() - c.getNbPlaces())); // BF-20
    }
    for (Offre autre : offreRepository.findByCourseId(c.getId())) {
      if (!autre.getId().equals(offre.getId()) && autre.getStatut() == StatutOffre.EN_ATTENTE) {
        autre.setStatut(StatutOffre.REJETEE);
        realtime.envoyer(autre.getChauffeur().getId(), RealtimeService.FILE_DEMANDES, "OFFRE_REJETEE", Map.of("courseId", c.getId()));
      }
    }
    realtime.envoyer(ch.getId(), RealtimeService.FILE_DEMANDES, "COURSE_ATTRIBUEE", mapper.toDto(c, ch.getId(), Role.CHAUFFEUR));
    notifications.notifier(ch.getId(), "course_attribuee", c.getId(), true, c.getDepartAdresse());
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "CHAUFFEUR_ASSIGNE", mapper.toDto(c, c.getClient().getId(), Role.CLIENT));
    notifications.notifier(c.getClient().getId(), "chauffeur_assigne", c.getId(), true, // BF-65 + SMS de secours
        ch.getUtilisateur().getPrenom(), ch.getVehicule().getImmatriculation());
  }

  /** Délai écoulé sans choix : la demande est relancée au prix de référence, puis expire (section 5.5). */
  @Transactional
  public void traiterDelaiOffres(Course c) {
    if (c.getStatut() != StatutCourse.RECHERCHE) {
      return;
    }
    List<Offre> enAttente = offreRepository.findEnAttente(c.getId(), c.getTourNegociation());
    enAttente.forEach(o -> o.setStatut(StatutOffre.EXPIREE));
    if (c.getTourNegociation() > parametres.entier(ParametreService.MAX_RELANCES)) {
      c.setStatut(StatutCourse.EXPIREE);
      c.setAnnuleeAt(LocalDateTime.now());
      c.setAnnuleePar("SYSTEME");
      c.setMotifAnnulation("Aucun chauffeur disponible");
      notifications.notifier(c.getClient().getId(), "aucun_chauffeur", c.getId(), false);
      realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "STATUT", statut(c));
      return;
    }
    c.setTourNegociation(c.getTourNegociation() + 1);
    c.setPrixPropose(c.getPrixReference());
    c.setOffresExpireAt(LocalDateTime.now().plusSeconds(parametres.entier(ParametreService.DELAI_OFFRES)));
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "RELANCE", mapper.toDto(c, c.getClient().getId(), Role.CLIENT));
    dispatch.solliciter(c);
  }

  // ================================================================== déroulement (côté chauffeur)

  @Transactional
  public CourseDto signalerArrivee(Long courseId) {
    Course c = courseDuChauffeur(courseId);
    exigerStatut(c, StatutCourse.ACCEPTEE);
    c.setStatut(StatutCourse.CHAUFFEUR_ARRIVE);
    c.setArriveAt(LocalDateTime.now());
    notifications.notifier(c.getClient().getId(), "chauffeur_arrive", c.getId(), true, // BF-65
        c.getVehicule() == null ? "" : c.getVehicule().getImmatriculation());
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "STATUT", statut(c));
    return mapper.toDto(c, c.getChauffeur().getId(), Role.CHAUFFEUR);
  }

  /** Démarrage après saisie du code à 4 chiffres (ou scan du QR code) donné par le client (BF-45). */
  @Transactional
  public CourseDto demarrer(Long courseId, String code) {
    Course c = courseDuChauffeur(courseId);
    if (c.getStatut() != StatutCourse.ACCEPTEE && c.getStatut() != StatutCourse.CHAUFFEUR_ARRIVE) {
      throw ApiException.badRequest("course.statut_invalide");
    }
    if (!c.getCodeVerification().equals(code.trim())) {
      throw ApiException.badRequest("course.code_invalide");
    }
    LocalDateTime now = LocalDateTime.now();
    c.setStatut(StatutCourse.EN_COURS);
    c.setDebutAt(now);
    c.setDernierMouvementAt(now);
    if (c.getArriveAt() == null) {
      c.setArriveAt(now);
    }
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "STATUT", statut(c));
    return mapper.toDto(c, c.getChauffeur().getId(), Role.CHAUFFEUR);
  }

  @Transactional
  public CourseDto terminer(Long courseId) {
    Course c = courseDuChauffeur(courseId);
    exigerStatut(c, StatutCourse.EN_COURS);
    c.setStatut(StatutCourse.TERMINEE);
    c.setFinAt(LocalDateTime.now());
    liberePlaces(c);
    paiementService.reglerFinDeCourse(c);
    promoService.apresCourseTerminee(c);
    notifications.notifier(c.getClient().getId(), "course_terminee", c.getId(), true, c.getMontantAPayer()); // BF-65
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "STATUT", statut(c));
    return mapper.toDto(c, c.getChauffeur().getId(), Role.CHAUFFEUR);
  }

  /** Annulation par le chauffeur avant la prise en charge : la demande est remise en recherche. */
  @Transactional
  public void annulerParChauffeur(Long courseId, String motif) {
    Course c = courseDuChauffeur(courseId);
    if (c.getStatut() != StatutCourse.ACCEPTEE && c.getStatut() != StatutCourse.CHAUFFEUR_ARRIVE) {
      throw ApiException.badRequest("course.statut_invalide");
    }
    Long chauffeurId = c.getChauffeur().getId();
    liberePlaces(c);
    ignoreeRepository.save(new CourseIgnoree(c.getId(), chauffeurId));
    journal.tracer("ANNULATION_CHAUFFEUR", "COURSE", c.getId(), motif);
    c.setChauffeur(null);
    c.setVehicule(null);
    c.setPrixFinal(null);
    c.setAccepteeAt(null);
    c.setArriveAt(null);
    c.setStatut(StatutCourse.RECHERCHE);
    c.setTourNegociation(c.getTourNegociation() + 1);
    c.setPrixPropose(c.getPrixReference());
    c.setOffresExpireAt(LocalDateTime.now().plusSeconds(parametres.entier(ParametreService.DELAI_OFFRES)));
    notifications.notifier(c.getClient().getId(), "chauffeur_annule", c.getId(), true);
    realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "RELANCE", mapper.toDto(c, c.getClient().getId(), Role.CLIENT));
    dispatch.solliciter(c);
  }

  // ================================================================== annulation par le client (BF-13)

  @Transactional
  public CourseDto annulerParClient(Long courseId, String motif) {
    Course c = courseDuClient(courseId);
    StatutCourse s = c.getStatut();
    if (s == StatutCourse.EN_COURS) {
      throw ApiException.badRequest("course.annulation_en_cours");
    }
    if (s == StatutCourse.TERMINEE || s == StatutCourse.ANNULEE || s == StatutCourse.EXPIREE) {
      throw ApiException.badRequest("course.statut_invalide");
    }
    LocalDateTime now = LocalDateTime.now();
    long frais = 0;
    if ((s == StatutCourse.ACCEPTEE || s == StatutCourse.CHAUFFEUR_ARRIVE) && c.getAccepteeAt() != null
        && c.getAccepteeAt().isBefore(now.minusMinutes(parametres.entier(ParametreService.ANNULATION_DELAI)))) {
      frais = parametres.entier(ParametreService.ANNULATION_FRAIS);
    }
    c.setStatut(StatutCourse.ANNULEE);
    c.setAnnuleeAt(now);
    c.setAnnuleePar("CLIENT");
    c.setMotifAnnulation(motif);
    c.setFraisAnnulation(frais);
    offreRepository.findByCourseId(c.getId()).stream().filter(o -> o.getStatut() == StatutOffre.EN_ATTENTE)
        .forEach(o -> o.setStatut(StatutOffre.EXPIREE));
    if (c.getChauffeur() != null) {
      liberePlaces(c);
      if (frais > 0) {
        // Les frais dédommagent le chauffeur qui s'est déplacé, moins la commission de la plateforme
        long commission = PaiementService.commission(TypeService.DEPOT, frais, 1,
            parametres.decimal(ParametreService.COMMISSION_PCT), 0);
        portefeuille.mouvement(c.getClient().getId(), TypeTransaction.FRAIS_ANNULATION, -frais, c,
            "Frais d'annulation " + c.getReference(), true);
        portefeuille.mouvement(c.getChauffeur().getId(), TypeTransaction.FRAIS_ANNULATION, frais - commission, c,
            "Dédommagement annulation " + c.getReference(), true);
      }
      notifications.notifier(c.getChauffeur().getId(), "client_annule", c.getId(), false);
      realtime.envoyer(c.getChauffeur().getId(), RealtimeService.FILE_DEMANDES, "COURSE_ANNULEE", Map.of("courseId", c.getId()));
    }
    return mapper.toDto(c, c.getClient().getId(), Role.CLIENT);
  }

  private void liberePlaces(Course c) {
    if (c.getTypeService() == TypeService.RAMASSAGE && c.getChauffeur() != null) {
      chauffeurRepository.findById(c.getChauffeur().getId()).ifPresent(ch -> {
        int capacite = ch.getVehicule() == null ? 4 : ch.getVehicule().getNbPlaces();
        ch.setPlacesLibres(Math.min(capacite, ch.getPlacesLibres() + c.getNbPlaces())); // BF-20 : descente
      });
    }
  }

  // ================================================================== suivi GPS temps réel (BF-32, BNF-01)

  /** Position envoyée par le chauffeur toutes les 5 s : diffusée aux clients de ses courses actives. */
  @Transactional
  public void majPosition(PositionDto pos) {
    Chauffeur ch = chauffeurRepository.findById(currentUser.id()).orElseThrow(() -> ApiException.forbidden("erreur.acces"));
    positions.mettreAJour(ch, pos.lat(), pos.lng());
    double cap = positions.position(ch.getId()).map(PositionService.Position::cap).orElse(0.0);
    for (Course c : courseRepository.findByChauffeurIdAndStatutIn(ch.getId(), ACTIVES)) {
      if (c.getStatut() == StatutCourse.EN_COURS) {
        var dernier = positionRepository.findTopByCourseIdOrderByCreatedAtDesc(c.getId()).orElse(null);
        if (dernier == null || Geo.distanceKm(dernier.getLatitude(), dernier.getLongitude(), pos.lat(), pos.lng()) > 0.03) {
          positionRepository.save(CoursePosition.builder().courseId(c.getId()).latitude(pos.lat()).longitude(pos.lng()).build());
          c.setDernierMouvementAt(LocalDateTime.now());
        }
      }
      double cibleLat = c.getStatut() == StatutCourse.EN_COURS ? c.getArriveeLat() : c.getDepartLat();
      double cibleLng = c.getStatut() == StatutCourse.EN_COURS ? c.getArriveeLng() : c.getDepartLng();
      double km = Geo.distanceKm(pos.lat(), pos.lng(), cibleLat, cibleLng) * 1.3;
      double eta = Math.max(1, Math.ceil(km / 22.0 * 60));
      realtime.envoyer(c.getClient().getId(), RealtimeService.FILE_COURSES, "POSITION",
          Map.of("courseId", c.getId(), "lat", pos.lat(), "lng", pos.lng(), "cap", cap, "etaMin", eta));
    }
  }

  // ================================================================== consultation

  @Transactional(readOnly = true)
  public CourseDto detail(Long courseId) {
    AuthUser auth = currentUser.auth();
    Course c = courseRepository.findById(courseId).orElseThrow(() -> ApiException.notFound("course.introuvable"));
    boolean participant = c.getClient().getId().equals(auth.id()) || (c.getChauffeur() != null && c.getChauffeur().getId().equals(auth.id()));
    if (!participant && auth.role() != Role.ADMIN && auth.role() != Role.SUPPORT) {
      throw ApiException.notFound("course.introuvable");
    }
    return mapper.toDto(c, auth.id(), auth.role());
  }

  /** Course en cours de l'utilisateur, pour reprendre l'écran après une coupure réseau. */
  @Transactional(readOnly = true)
  public Optional<CourseDto> courseActive() {
    AuthUser auth = currentUser.auth();
    List<Course> courses = auth.role() == Role.CHAUFFEUR
        ? courseRepository.findByChauffeurIdAndStatutIn(auth.id(), ACTIVES)
        : courseRepository.findByClientIdAndStatutIn(auth.id(), EN_COURS_CLIENT);
    return courses.stream().max(Comparator.comparing(Course::getCreatedAt)).map(c -> mapper.toDto(c, auth.id(), auth.role()));
  }

  /** Toutes les courses actives du chauffeur (plusieurs passagers en ramassage). */
  @Transactional(readOnly = true)
  public List<CourseDto> coursesActivesChauffeur() {
    Long id = currentUser.id();
    return courseRepository.findByChauffeurIdAndStatutIn(id, ACTIVES).stream()
        .map(c -> mapper.toDto(c, id, Role.CHAUFFEUR)).toList();
  }

  @Transactional(readOnly = true)
  public List<CourseDto> historique(int page) {
    AuthUser auth = currentUser.auth();
    var pageable = PageRequest.of(page, 20);
    var courses = auth.role() == Role.CHAUFFEUR
        ? courseRepository.findByChauffeurIdOrderByCreatedAtDesc(auth.id(), pageable)
        : courseRepository.findByClientIdOrderByCreatedAtDesc(auth.id(), pageable);
    return courses.map(c -> mapper.toDto(c, auth.id(), auth.role())).getContent();
  }

  /** Itinéraire de navigation : vers le client puis vers la destination (BF-36). */
  @Transactional(readOnly = true)
  public ItineraireDto itineraire(Long courseId) {
    Course c = courseDuChauffeur(courseId);
    var pos = positions.position(c.getChauffeur().getId()).orElse(null);
    RoutageService.Itineraire it;
    if (c.getStatut() == StatutCourse.EN_COURS || pos == null) {
      it = routage.trace(c.getDepartLat(), c.getDepartLng(), c.getArriveeLat(), c.getArriveeLng());
    } else {
      it = routage.trace(pos.lat(), pos.lng(), c.getDepartLat(), c.getDepartLng());
    }
    return new ItineraireDto(CourseMapper.arrondi(it.distanceKm()), Math.ceil(it.dureeMin()), it.estime(), it.trace());
  }

  // ================================================================== notation (BF-49, BF-50)

  @Transactional
  public void noter(Long courseId, NotationRequest req) {
    AuthUser auth = currentUser.auth();
    Course c = courseRepository.findById(courseId).orElseThrow(() -> ApiException.notFound("course.introuvable"));
    if (c.getStatut() != StatutCourse.TERMINEE || c.getChauffeur() == null) {
      throw ApiException.badRequest("notation.course_non_terminee");
    }
    Utilisateur cible;
    if (c.getClient().getId().equals(auth.id())) {
      cible = c.getChauffeur();
    } else if (c.getChauffeur().getId().equals(auth.id())) {
      cible = c.getClient();
    } else {
      throw ApiException.notFound("course.introuvable");
    }
    if (notationRepository.existsByCourseIdAndAuteurId(c.getId(), auth.id())) {
      throw ApiException.conflict("notation.deja_faite");
    }
    notationRepository.save(Notation.builder().course(c).auteur(utilisateurRepository.getReferenceById(auth.id()))
        .cible(cible).note(req.note()).commentaire(req.commentaire()).build());
    Utilisateur u = utilisateurRepository.verrouiller(cible.getId()).orElseThrow();
    double total = u.getNoteMoyenne() * u.getNbNotes() + req.note();
    u.setNbNotes(u.getNbNotes() + 1);
    u.setNoteMoyenne(total / u.getNbNotes());
    if (u.getRole() == Role.CHAUFFEUR && u.getStatut() == StatutCompte.ACTIF
        && u.getNbNotes() >= parametres.entier(ParametreService.MIN_NOTES)
        && u.getNoteMoyenne() < parametres.decimal(ParametreService.SEUIL_SUSPENSION)) {
      u.setStatut(StatutCompte.SUSPENDU); // BF-50 : suspension pour examen
      chauffeurRepository.findById(u.getId()).ifPresent(ch -> ch.setDisponible(false));
      journal.tracer("SUSPENSION_AUTO_NOTE", "UTILISATEUR", u.getId(),
          String.format("Note moyenne %.2f sur %d avis", u.getNoteMoyenne(), u.getNbNotes()));
      notifications.notifier(u.getId(), "suspension_note", null, true);
    }
  }

  // ================================================================== utilitaires

  Course courseDuClient(Long courseId) {
    return courseRepository.findById(courseId).filter(c -> c.getClient().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
  }

  Course courseDuChauffeur(Long courseId) {
    return courseRepository.findById(courseId)
        .filter(c -> c.getChauffeur() != null && c.getChauffeur().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
  }

  private Chauffeur chauffeurConnecte() {
    Chauffeur ch = chauffeurRepository.findById(currentUser.id()).orElseThrow(() -> ApiException.forbidden("erreur.acces"));
    if (ch.getUtilisateur().getStatut() != StatutCompte.ACTIF) {
      throw ApiException.forbidden("chauffeur.compte_inactif");
    }
    return ch;
  }

  private static void exigerStatut(Course c, StatutCourse attendu) {
    if (c.getStatut() != attendu) {
      throw ApiException.badRequest("course.statut_invalide");
    }
  }

  private Map<String, Object> statut(Course c) {
    return Map.of("courseId", c.getId(), "statut", c.getStatut().name());
  }

  private OffreDto offreDto(Offre o, Course c) {
    var ch = chauffeurRepository.findById(o.getChauffeur().getId()).orElse(null);
    double km = o.getDistancePriseEnChargeKm() == null ? 0 : o.getDistancePriseEnChargeKm();
    return new OffreDto(o.getId(), c.getId(),
        mapper.chauffeurPublic(o.getChauffeur(), ch == null ? null : ch.getVehicule(), false, true),
        o.getPrix(), o.getType(), o.getStatut(), CourseMapper.arrondi(km), Math.max(1, Math.ceil(km * 1.3 / 22.0 * 60)),
        o.getCreatedAt());
  }
}
