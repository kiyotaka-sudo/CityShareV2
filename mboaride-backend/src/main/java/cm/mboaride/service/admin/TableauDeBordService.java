package cm.mboaride.service.admin;

import cm.mboaride.dto.AdminDtos.*;
import cm.mboaride.entity.Chauffeur;
import cm.mboaride.entity.Course;
import cm.mboaride.enums.*;
import cm.mboaride.repository.*;
import cm.mboaride.service.*;
import cm.mboaride.service.paiement.PaiementService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Indicateurs du tableau de bord : courses en cours, chauffeurs connectés, chiffre d'affaires, annulations (BF-58). */
@Service
@RequiredArgsConstructor
public class TableauDeBordService {
  private final CourseRepository courseRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final UtilisateurRepository utilisateurRepository;
  private final DocumentChauffeurRepository documentRepository;
  private final RepereRepository repereRepository;
  private final RetraitRepository retraitRepository;
  private final PositionService positions;
  private final SecuriteService securite;
  private final ReclamationService reclamations;
  private final PaiementService paiementService;
  private final SmsService smsService;

  @Transactional(readOnly = true)
  public TableauDeBord calculer() {
    LocalDate today = LocalDate.now();
    LocalDateTime debut = today.minusDays(29).atStartOfDay();
    List<Course> courses30j = courseRepository.findCreeesEntre(debut, LocalDateTime.now().plusMinutes(1));
    LocalDateTime debutJour = today.atStartOfDay();
    LocalDateTime debutMois = today.withDayOfMonth(1).atStartOfDay();
    LocalDateTime debut7j = today.minusDays(6).atStartOfDay();

    List<Course> terminees = courses30j.stream().filter(c -> c.getStatut() == StatutCourse.TERMINEE && c.getFinAt() != null).toList();
    long caJour = somme(terminees, debutJour, false);
    long comJour = somme(terminees, debutJour, true);
    List<Course> moisTerminees = courseRepository.findCreeesEntre(debutMois.isBefore(debut) ? debutMois : debut, LocalDateTime.now().plusMinutes(1))
        .stream().filter(c -> c.getStatut() == StatutCourse.TERMINEE && c.getFinAt() != null).toList();
    long caMois = somme(moisTerminees, debutMois, false);
    long comMois = somme(moisTerminees, debutMois, true);

    long termines7 = courses30j.stream().filter(c -> !c.getCreatedAt().isBefore(debut7j) && c.getStatut() == StatutCourse.TERMINEE).count();
    long annules7 = courses30j.stream().filter(c -> !c.getCreatedAt().isBefore(debut7j)
        && (c.getStatut() == StatutCourse.ANNULEE || c.getStatut() == StatutCourse.EXPIREE)).count();
    double taux = termines7 + annules7 == 0 ? 0 : Math.round(annules7 * 1000.0 / (termines7 + annules7)) / 10.0;

    List<SerieJour> serie = new ArrayList<>();
    for (int i = 13; i >= 0; i--) {
      LocalDate j = today.minusDays(i);
      List<Course> duJour = courses30j.stream().filter(c -> c.getCreatedAt().toLocalDate().equals(j)).toList();
      List<Course> ok = duJour.stream().filter(c -> c.getStatut() == StatutCourse.TERMINEE).toList();
      serie.add(new SerieJour(j, ok.size(),
          duJour.stream().filter(c -> c.getStatut() == StatutCourse.ANNULEE || c.getStatut() == StatutCourse.EXPIREE).count(),
          ok.stream().mapToLong(c -> nz(c.getPrixFinal())).sum(), ok.stream().mapToLong(c -> nz(c.getCommission())).sum()));
    }
    Map<String, Long> repartition = new LinkedHashMap<>();
    for (TypeService t : TypeService.values()) {
      repartition.put(t.name(), terminees.stream().filter(c -> c.getTypeService() == t).count());
    }

    List<Course> actives = courseRepository.findByStatutIn(EnumSet.of(StatutCourse.ACCEPTEE, StatutCourse.CHAUFFEUR_ARRIVE, StatutCourse.EN_COURS));
    Set<Long> chauffeursOccupes = actives.stream().filter(c -> c.getChauffeur() != null).map(c -> c.getChauffeur().getId()).collect(Collectors.toSet());
    List<PointCarte> carte = new ArrayList<>();
    long connectes = 0;
    for (Chauffeur ch : chauffeurRepository.findDisponibles()) {
      var pos = positions.positionRecente(ch, 300).orElse(null);
      if (pos == null) {
        continue;
      }
      connectes++;
      carte.add(new PointCarte(ch.getId(), ch.getUtilisateur().getNomComplet(), pos.lat(), pos.lng(),
          ch.getTypeService().name(), chauffeursOccupes.contains(ch.getId()) ? "EN_COURSE" : (ch.getModeRamassage() ? "RAMASSAGE" : "LIBRE")));
    }
    courseRepository.findByStatut(StatutCourse.RECHERCHE).forEach(c -> carte.add(new PointCarte(c.getId(), c.getReference(),
        c.getDepartLat(), c.getDepartLng(), "DEMANDE", c.getTypeService().name())));

    return new TableauDeBord(
        courseRepository.countByStatutIn(EnumSet.of(StatutCourse.ACCEPTEE, StatutCourse.CHAUFFEUR_ARRIVE, StatutCourse.EN_COURS)),
        courseRepository.countByStatutIn(EnumSet.of(StatutCourse.RECHERCHE)),
        connectes, chauffeursOccupes.size(),
        courses30j.stream().filter(c -> !c.getCreatedAt().isBefore(debutJour)).count(),
        caJour, comJour, caMois, comMois, taux,
        securite.alertesActives(), reclamations.ouvertes(),
        utilisateurRepository.countByRoleAndStatut(Role.CHAUFFEUR, StatutCompte.INACTIF),
        documentRepository.countByStatut(StatutDocument.EN_ATTENTE),
        repereRepository.countByStatut(StatutRepere.PROPOSE),
        retraitRepository.countByStatut(StatutRetrait.EN_ATTENTE),
        utilisateurRepository.countByRole(Role.CLIENT),
        utilisateurRepository.countByDateInscriptionAfter(debut7j),
        utilisateurRepository.countByRole(Role.CHAUFFEUR),
        serie, repartition, carte, paiementService.etatFournisseurs(), smsService.mode());
  }

  private static long somme(List<Course> courses, LocalDateTime depuis, boolean commission) {
    return courses.stream().filter(c -> !c.getFinAt().isBefore(depuis))
        .mapToLong(c -> commission ? nz(c.getCommission()) : nz(c.getPrixFinal())).sum();
  }

  private static long nz(Long v) {
    return v == null ? 0 : v;
  }
}
