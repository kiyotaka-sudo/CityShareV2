package cm.mboaride.scheduler;

import cm.mboaride.entity.Course;
import cm.mboaride.entity.DocumentChauffeur;
import cm.mboaride.enums.StatutCourse;
import cm.mboaride.repository.*;
import cm.mboaride.service.*;
import cm.mboaride.service.paiement.PaiementService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Traitements automatiques : négociation, courses planifiées, paiements, anomalies, rappels et purge des données. */
@Slf4j
@Component
@RequiredArgsConstructor
public class TachesPlanifiees {
  private final CourseRepository courseRepository;
  private final CourseService courseService;
  private final PaiementService paiementService;
  private final SecuriteService securiteService;
  private final DocumentChauffeurRepository documentRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final CoursePositionRepository positionRepository;
  private final OtpCodeRepository otpRepository;
  private final NotificationService notifications;
  private final ParametreService parametres;
  private final PositionService positions;

  /** Délai de choix des offres écoulé : relance au prix de référence ou expiration (section 5.5). */
  @Scheduled(fixedDelay = 5000, initialDelay = 15000)
  public void delaisNegociation() {
    for (Course c : courseRepository.findRecherchesExpirees(LocalDateTime.now())) {
      try {
        courseService.traiterDelaiOffres(courseRepository.findById(c.getId()).orElseThrow());
      } catch (Exception ex) {
        log.warn("Relance de la course {} impossible : {}", c.getReference(), ex.getMessage());
      }
    }
  }

  /** Lancement des courses planifiées (BF-14). */
  @Scheduled(fixedDelay = 60000, initialDelay = 20000)
  public void coursesPlanifiees() {
    LocalDateTime limite = LocalDateTime.now().plusMinutes(parametres.entier(ParametreService.PLANIF_AVANCE));
    for (Course c : courseRepository.findPlanifieesALancer(limite)) {
      try {
        courseService.lancerPlanifiee(courseRepository.findById(c.getId()).orElseThrow());
      } catch (Exception ex) {
        log.warn("Lancement de la course planifiée {} impossible : {}", c.getReference(), ex.getMessage());
      }
    }
  }

  /** Vérification des paiements et retraits en attente (secours si le webhook ne parvient pas). */
  @Scheduled(fixedDelay = 15000, initialDelay = 30000)
  public void paiementsEnAttente() {
    try {
      paiementService.verifierPaiementsEnAttente();
      paiementService.verifierRetraitsEnAttente();
    } catch (Exception ex) {
      log.warn("Vérification des paiements : {}", ex.getMessage());
    }
  }

  /** Détection des arrêts prolongés et déviations (BF-46). */
  @Scheduled(fixedDelay = 60000, initialDelay = 60000)
  public void anomalies() {
    try {
      securiteService.detecterAnomalies();
    } catch (Exception ex) {
      log.warn("Détection d'anomalies : {}", ex.getMessage());
    }
  }

  /** Chauffeurs « disponibles » qui n'envoient plus de position depuis 15 min : repassés indisponibles. */
  @Scheduled(fixedDelay = 120000, initialDelay = 90000)
  @Transactional
  public void chauffeursFantomes() {
    chauffeurRepository.findDisponiblesInactifsDepuis(LocalDateTime.now().minusMinutes(15)).forEach(ch -> {
      if (positions.positionRecente(ch, 900).isEmpty()) {
        ch.setDisponible(false);
        ch.setModeRamassage(false);
      }
    });
  }

  /** Rappel avant expiration des documents des chauffeurs (BF-06), chaque jour à 8 h. */
  @Scheduled(cron = "0 0 8 * * *", zone = "Africa/Douala")
  @Transactional
  public void rappelsDocuments() {
    LocalDate limite = LocalDate.now().plusDays(parametres.entier(ParametreService.RAPPEL_DOCUMENTS));
    for (DocumentChauffeur d : documentRepository.findExpirantAvant(limite)) {
      long jours = ChronoUnit.DAYS.between(LocalDate.now(), d.getDateExpiration());
      notifications.notifier(d.getChauffeur().getId(), "document_expiration", null, true, d.getType().name(), Math.max(0, jours));
      d.setRappelEnvoye(true);
    }
  }

  /** Durée de conservation limitée des données (loi n° 2024/017) : traces GPS et codes OTP. */
  @Scheduled(cron = "0 30 3 * * *", zone = "Africa/Douala")
  @Transactional
  public void purgeDonnees() {
    int positionsPurgees = positionRepository.purgerAvant(
        LocalDateTime.now().minusDays(parametres.entier(ParametreService.CONSERVATION_POSITIONS)));
    int otps = otpRepository.purgerAvant(LocalDateTime.now().minusDays(1));
    log.info("Purge : {} positions GPS, {} codes OTP", positionsPurgees, otps);
  }

  /** Les courses restées en EN_COURS plus de 12 h sont signalées (oubli de clôture). */
  @Scheduled(cron = "0 0 * * * *")
  public void coursesOubliees() {
    courseRepository.findByStatut(StatutCourse.EN_COURS).stream()
        .filter(c -> c.getDebutAt() != null && c.getDebutAt().isBefore(LocalDateTime.now().minusHours(12)))
        .forEach(c -> log.warn("Course {} en cours depuis plus de 12 h", c.getReference()));
  }
}
