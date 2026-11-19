package cm.mboaride.service;

import cm.mboaride.dto.CourseDtos.DemandeChauffeurDto;
import cm.mboaride.dto.CourseDtos.PointDto;
import cm.mboaride.entity.Chauffeur;
import cm.mboaride.entity.Course;
import cm.mboaride.enums.StatutCourse;
import cm.mboaride.enums.TypeService;
import cm.mboaride.enums.TypeVehicule;
import cm.mboaride.repository.ChauffeurRepository;
import cm.mboaride.repository.CourseIgnoreeRepository;
import cm.mboaride.repository.CourseRepository;
import cm.mboaride.repository.OffreRepository;
import cm.mboaride.util.Geo;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mise en relation : sélection des chauffeurs disponibles les plus proches correspondant au service (BF-10),
 * à la direction et aux places libres en ramassage (BF-17), et à l'option Mboa Lady (BF-48).
 */
@Service
@RequiredArgsConstructor
public class DispatchService {
  /** Une position plus ancienne indique un chauffeur déconnecté. */
  static final int FRAICHEUR_POSITION_S = 180;
  static final int MAX_CHAUFFEURS_SOLLICITES = 10;
  static final EnumSet<StatutCourse> STATUTS_ACTIFS =
      EnumSet.of(StatutCourse.ACCEPTEE, StatutCourse.CHAUFFEUR_ARRIVE, StatutCourse.EN_COURS);

  public record Candidat(Chauffeur chauffeur, double distanceKm) {}

  private final ChauffeurRepository chauffeurRepository;
  private final CourseRepository courseRepository;
  private final CourseIgnoreeRepository ignoreeRepository;
  private final OffreRepository offreRepository;
  private final PositionService positions;
  private final ParametreService parametres;
  private final RealtimeService realtime;
  private final NotificationService notifications;

  /** Chauffeurs éligibles pour une course, du plus proche au plus éloigné. */
  @Transactional(readOnly = true)
  public List<Candidat> candidats(Course course) {
    double rayon = parametres.decimal(ParametreService.RAYON_RECHERCHE);
    return chauffeurRepository.findDisponibles().stream()
        .map(ch -> positions.positionRecente(ch, FRAICHEUR_POSITION_S)
            .map(p -> new Candidat(ch, Geo.distanceKm(p.lat(), p.lng(), course.getDepartLat(), course.getDepartLng())))
            .orElse(null))
        .filter(c -> c != null && c.distanceKm() <= rayon)
        .filter(c -> compatible(c.chauffeur(), course))
        .filter(c -> !ignoreeRepository.findCourseIdsByChauffeur(c.chauffeur().getId()).contains(course.getId()))
        .sorted(Comparator.comparingDouble(Candidat::distanceKm))
        .limit(MAX_CHAUFFEURS_SOLLICITES)
        .toList();
  }

  /** Règles de compatibilité chauffeur / demande. */
  public boolean compatible(Chauffeur ch, Course course) {
    if (ch.getVehicule() == null || !ch.getVehicule().getActif()) {
      return false;
    }
    if (Boolean.TRUE.equals(course.getMboaLady()) && !"F".equals(ch.getUtilisateur().getGenre())) {
      return false;
    }
    if (course.getClient().getId().equals(ch.getId())) {
      return false;
    }
    TypeService type = course.getTypeService();
    if (type == TypeService.MOTO) {
      return ch.getTypeService() == TypeVehicule.MOTO && !aUneCourseActive(ch.getId());
    }
    if (ch.getTypeService() != TypeVehicule.TAXI) {
      return false;
    }
    if (type == TypeService.DEPOT) {
      // Course privée : véhicule entièrement libre et capacité suffisante
      return !ch.getModeRamassage() && !aUneCourseActive(ch.getId()) && ch.getVehicule().getNbPlaces() >= course.getNbPlaces();
    }
    // Ramassage : même direction et places libres
    if (!ch.getModeRamassage() || ch.getPlacesLibres() < course.getNbPlaces() || ch.getDirectionLat() == null) {
      return false;
    }
    var pos = positions.position(ch).orElse(null);
    if (pos == null) {
      return false;
    }
    double capChauffeur = Geo.cap(pos.lat(), pos.lng(), ch.getDirectionLat(), ch.getDirectionLng());
    double capClient = Geo.cap(course.getDepartLat(), course.getDepartLng(), course.getArriveeLat(), course.getArriveeLng());
    return Geo.ecartAngulaire(capChauffeur, capClient) <= parametres.decimal(ParametreService.ANGLE_RAMASSAGE);
  }

  public boolean aUneCourseActive(Long chauffeurId) {
    return !courseRepository.findByChauffeurIdAndStatutIn(chauffeurId, STATUTS_ACTIFS).isEmpty();
  }

  /** Envoie la demande aux chauffeurs sélectionnés (temps réel + push). */
  @Transactional(readOnly = true)
  public int solliciter(Course course) {
    List<Candidat> candidats = candidats(course);
    for (Candidat c : candidats) {
      realtime.envoyer(c.chauffeur().getId(), RealtimeService.FILE_DEMANDES, "NOUVELLE_DEMANDE",
          demandeDto(course, c.distanceKm(), false));
      notifications.notifier(c.chauffeur().getId(), "nouvelle_demande", course.getId(), false,
          course.getPrixPropose(), course.getArriveeAdresse());
    }
    return candidats.size();
  }

  /** Demandes ouvertes pour un chauffeur (consultation régulière, utile en réseau faible). */
  @Transactional(readOnly = true)
  public List<DemandeChauffeurDto> demandesPour(Chauffeur ch) {
    var pos = positions.positionRecente(ch, FRAICHEUR_POSITION_S).orElse(null);
    if (pos == null || !ch.getDisponible()) {
      return List.of();
    }
    double rayon = parametres.decimal(ParametreService.RAYON_RECHERCHE);
    Set<Long> ignorees = ignoreeRepository.findCourseIdsByChauffeur(ch.getId());
    return courseRepository.findByStatut(StatutCourse.RECHERCHE).stream()
        .filter(c -> !ignorees.contains(c.getId()))
        .filter(c -> Geo.distanceKm(pos.lat(), pos.lng(), c.getDepartLat(), c.getDepartLng()) <= rayon)
        .filter(c -> compatible(ch, c))
        .map(c -> demandeDto(c, Geo.distanceKm(pos.lat(), pos.lng(), c.getDepartLat(), c.getDepartLng()),
            offreRepository.existsByCourseIdAndChauffeurIdAndTour(c.getId(), ch.getId(), c.getTourNegociation())))
        .sorted(Comparator.comparingDouble(DemandeChauffeurDto::distancePriseEnChargeKm))
        .toList();
  }

  /** Nombre de chauffeurs disponibles autour d'un point pour un type de véhicule (estimation et surge). */
  public int chauffeursProches(double lat, double lng, TypeVehicule type) {
    double rayon = parametres.decimal(ParametreService.RAYON_RECHERCHE);
    return (int) chauffeurRepository.findDisponibles().stream()
        .filter(ch -> ch.getTypeService() == type)
        .filter(ch -> positions.positionRecente(ch, FRAICHEUR_POSITION_S)
            .map(p -> Geo.distanceKm(p.lat(), p.lng(), lat, lng) <= rayon).orElse(false))
        .count();
  }

  /** Demandes en attente autour d'un point au cours des 10 dernières minutes. */
  public int demandesProches(double lat, double lng) {
    double rayon = parametres.decimal(ParametreService.RAYON_RECHERCHE);
    return (int) courseRepository.findDemandesDepuis(LocalDateTime.now().minusMinutes(10)).stream()
        .filter(c -> c.getStatut() == StatutCourse.RECHERCHE)
        .filter(c -> Geo.distanceKm(c.getDepartLat(), c.getDepartLng(), lat, lng) <= rayon)
        .count();
  }

  public DemandeChauffeurDto demandeDto(Course c, double distanceKm, boolean dejaRepondu) {
    return new DemandeChauffeurDto(c.getId(), c.getReference(), c.getTypeService(), c.getNbPlaces(),
        new PointDto(c.getDepartLat(), c.getDepartLng(), c.getDepartAdresse(), c.getDepartRepere()),
        new PointDto(c.getArriveeLat(), c.getArriveeLng(), c.getArriveeAdresse(), null),
        CourseMapper.arrondi(c.getDistanceKm()), Math.ceil(c.getDureeMin()), c.getPrixPropose(), c.getPrixMin(), c.getPrixMax(),
        CourseMapper.arrondi(distanceKm), c.getClient().getPrenom(), CourseMapper.arrondi(c.getClient().getNoteMoyenne()),
        c.getModePaiement(), c.getOffresExpireAt(), c.getTourNegociation(), dejaRepondu,
        c.getTypeService() != TypeService.RAMASSAGE, c.getDatePlanifiee());
  }
}
