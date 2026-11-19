package cm.mboaride.service;

import cm.mboaride.config.AppProperties;
import cm.mboaride.dto.CourseDtos.PointDto;
import cm.mboaride.dto.CourseDtos.SuiviPublicDto;
import cm.mboaride.dto.SupportDtos.*;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.util.Geo;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sécurité (section 5.9) : bouton SOS, partage du trajet, détection d'arrêts prolongés et de déviations. */
@Slf4j
@Service
@RequiredArgsConstructor
public class SecuriteService {
  public static final String TOPIC_ALERTES = "/topic/admin/alertes";

  private final AlerteSosRepository alerteRepository;
  private final CourseRepository courseRepository;
  private final ContactConfianceRepository contactRepository;
  private final CoursePositionRepository positionRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final PositionService positions;
  private final SmsService smsService;
  private final NotificationService notifications;
  private final RealtimeService realtime;
  private final ParametreService parametres;
  private final CourseMapper mapper;
  private final AppProperties props;
  private final CurrentUser currentUser;

  /** Alerte SOS : support et contacts de confiance prévenus avec la position GPS et le lien de suivi (BF-43). */
  @Transactional
  public AlerteDto declencherSos(SosRequest req) {
    Utilisateur u = currentUser.get();
    Course course = null;
    if (req.courseId() != null) {
      course = courseRepository.findById(req.courseId())
          .filter(c -> c.getClient().getId().equals(u.getId()) || (c.getChauffeur() != null && c.getChauffeur().getId().equals(u.getId())))
          .orElse(null);
    }
    Double lat = req.lat();
    Double lng = req.lng();
    if ((lat == null || lng == null) && course != null && course.getChauffeur() != null) {
      var pos = positions.position(course.getChauffeur().getId()).orElse(null);
      if (pos != null) {
        lat = pos.lat();
        lng = pos.lng();
      }
    }
    AlerteSos alerte = alerteRepository.save(AlerteSos.builder().declencheur(u).course(course).type(TypeAlerte.SOS)
        .latitude(lat).longitude(lng).build());

    String carte = lat == null ? "" : String.format(Locale.ROOT, " https://maps.google.com/?q=%.6f,%.6f", lat, lng);
    String suivi = course == null ? "" : " Suivi : " + mapper.lienPartage(course);
    String vehicule = course != null && course.getVehicule() != null
        ? " Véhicule " + course.getVehicule().getLibelle() + " " + course.getVehicule().getImmatriculation() + "." : "";
    String texte = "ALERTE MboaRide : " + u.getNomComplet() + " a déclenché un SOS." + vehicule + carte + suivi;
    int prevenus = 0;
    for (ContactConfiance contact : contactRepository.findByUtilisateurId(u.getId())) {
      if (smsService.envoyer(contact.getTelephone(), texte)) {
        prevenus++;
      }
    }
    alerte.setContactsNotifies(prevenus);
    AlerteDto dto = toDto(alerte);
    realtime.diffuser(TOPIC_ALERTES, "SOS", dto);
    log.warn("SOS #{} déclenché par l'utilisateur {} (course {})", alerte.getId(), u.getId(), course == null ? "-" : course.getReference());
    return dto;
  }

  /** Mise à jour de la position pendant une alerte (le SOS suit la personne en temps réel). */
  @Transactional
  public void majPositionSos(Long alerteId, double lat, double lng) {
    AlerteSos a = alerteRepository.findById(alerteId)
        .filter(x -> x.getDeclencheur() != null && x.getDeclencheur().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    if (a.getStatut() != StatutAlerte.RESOLUE) {
      a.setLatitude(lat);
      a.setLongitude(lng);
      realtime.diffuser(TOPIC_ALERTES, "SOS_POSITION", toDto(a));
    }
  }

  /** Lien de suivi à partager par SMS ou messagerie (BF-44). */
  @Transactional(readOnly = true)
  public PartageDto partager(Long courseId) {
    Course c = courseRepository.findById(courseId).filter(x -> x.getClient().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
    String lien = mapper.lienPartage(c);
    String vehicule = c.getVehicule() == null ? "" : " (" + c.getVehicule().getLibelle() + ", " + c.getVehicule().getImmatriculation() + ")";
    return new PartageDto(lien, "Je suis en route avec MboaRide" + vehicule + ". Suivez mon trajet en direct : " + lien);
  }

  /** Page publique de suivi : visible pendant la course et 30 minutes après. */
  @Transactional(readOnly = true)
  public SuiviPublicDto suiviPublic(String token) {
    Course c = courseRepository.findByTokenPartage(token).orElseThrow(() -> ApiException.notFound("suivi.introuvable"));
    LocalDateTime fin = c.getFinAt() != null ? c.getFinAt() : c.getAnnuleeAt();
    if (fin != null && fin.isBefore(LocalDateTime.now().minusMinutes(30))) {
      throw ApiException.notFound("suivi.expire");
    }
    Double lat = null;
    Double lng = null;
    LocalDateTime at = null;
    if (c.getChauffeur() != null && c.isActive()) {
      var pos = positions.position(c.getChauffeur().getId())
          .or(() -> chauffeurRepository.findById(c.getChauffeur().getId()).flatMap(positions::position)).orElse(null);
      if (pos != null) {
        lat = pos.lat();
        lng = pos.lng();
        at = pos.at();
      }
    }
    List<double[]> trace = positionRepository.findByCourseIdOrderByCreatedAtAsc(c.getId()).stream()
        .map(p -> new double[] {p.getLatitude(), p.getLongitude()}).toList();
    Vehicule v = c.getVehicule();
    return new SuiviPublicDto(c.getReference(), c.getStatut(), c.getTypeService(),
        new PointDto(c.getDepartLat(), c.getDepartLng(), c.getDepartAdresse(), c.getDepartRepere()),
        new PointDto(c.getArriveeLat(), c.getArriveeLng(), c.getArriveeAdresse(), null),
        c.getChauffeur() == null ? null : c.getChauffeur().getPrenom(),
        v == null ? null : v.getLibelle(), v == null ? null : v.getImmatriculation(), v == null ? null : v.getCouleur(),
        lat, lng, at, c.getDebutAt(), trace);
  }

  /** Détection automatique d'anomalies sur les courses en cours (BF-46). */
  @Transactional
  public void detecterAnomalies() {
    LocalDateTime now = LocalDateTime.now();
    long arretMin = parametres.entier(ParametreService.ANOMALIE_ARRET);
    double toleranceKm = parametres.decimal(ParametreService.ANOMALIE_DEVIATION);
    for (Course c : courseRepository.findByStatut(StatutCourse.EN_COURS)) {
      if (c.getAnomalieSignalee() || c.getChauffeur() == null) {
        continue;
      }
      TypeAlerte anomalie = null;
      Double lat = null;
      Double lng = null;
      var pos = positions.position(c.getChauffeur().getId()).orElse(null);
      if (pos != null) {
        lat = pos.lat();
        lng = pos.lng();
        if (estDevie(c, pos.lat(), pos.lng(), toleranceKm)) {
          anomalie = TypeAlerte.ANOMALIE_DEVIATION;
        }
      }
      if (anomalie == null && c.getDernierMouvementAt() != null && c.getDernierMouvementAt().isBefore(now.minusMinutes(arretMin))) {
        anomalie = TypeAlerte.ANOMALIE_ARRET;
      }
      if (anomalie != null) {
        c.setAnomalieSignalee(true);
        AlerteSos alerte = alerteRepository.save(AlerteSos.builder().course(c).declencheur(c.getClient()).type(anomalie)
            .latitude(lat).longitude(lng).notes("Détection automatique").build());
        realtime.diffuser(TOPIC_ALERTES, anomalie.name(), toDto(alerte));
        notifications.notifier(c.getClient().getId(), anomalie == TypeAlerte.ANOMALIE_ARRET ? "anomalie_arret" : "anomalie_deviation",
            c.getId(), true);
      }
    }
  }

  /** Déviation : le détour par la position actuelle dépasse nettement le trajet direct. */
  static boolean estDevie(Course c, double lat, double lng, double toleranceKm) {
    double direct = Geo.distanceKm(c.getDepartLat(), c.getDepartLng(), c.getArriveeLat(), c.getArriveeLng());
    double viaPosition = Geo.distanceKm(c.getDepartLat(), c.getDepartLng(), lat, lng)
        + Geo.distanceKm(lat, lng, c.getArriveeLat(), c.getArriveeLng());
    return viaPosition - direct > Math.max(toleranceKm, direct * 0.5);
  }

  public AlerteDto toDto(AlerteSos a) {
    Course c = a.getCourse();
    Utilisateur d = a.getDeclencheur();
    Utilisateur ch = c == null ? null : c.getChauffeur();
    return new AlerteDto(a.getId(), a.getType(), a.getStatut(), a.getLatitude(), a.getLongitude(),
        c == null ? null : c.getId(), c == null ? null : c.getReference(),
        d == null ? null : d.getId(), d == null ? null : d.getNomComplet(), d == null ? null : d.getTelephone(),
        ch == null ? null : ch.getNomComplet(), ch == null ? null : ch.getTelephone(),
        c == null || c.getVehicule() == null ? null : c.getVehicule().getImmatriculation(),
        a.getNotes(), a.getContactsNotifies(), a.getCreatedAt(), a.getResolueAt(),
        c == null ? null : props.publicUrl() + "/suivi/" + c.getTokenPartage());
  }

  @Transactional(readOnly = true)
  public List<AlerteDto> alertes() {
    return alerteRepository.findAllDetail().stream().map(this::toDto).toList();
  }

  @Transactional
  public AlerteDto traiter(Long id, StatutAlerte statut, String notes) {
    AlerteSos a = alerteRepository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    a.setStatut(statut);
    a.setTraitePar(currentUser.id());
    if (notes != null && !notes.isBlank()) {
      a.setNotes((a.getNotes() == null ? "" : a.getNotes() + "\n") + "[" + LocalDateTime.now().withNano(0) + "] " + notes.trim());
    }
    if (statut == StatutAlerte.RESOLUE) {
      a.setResolueAt(LocalDateTime.now());
    }
    return toDto(a);
  }

  public long alertesActives() {
    return alerteRepository.countByStatutIn(EnumSet.of(StatutAlerte.ACTIVE, StatutAlerte.EN_TRAITEMENT));
  }
}
