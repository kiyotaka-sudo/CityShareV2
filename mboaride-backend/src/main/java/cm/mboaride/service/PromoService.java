package cm.mboaride.service;

import cm.mboaride.entity.CodePromo;
import cm.mboaride.entity.Course;
import cm.mboaride.entity.UtilisationPromo;
import cm.mboaride.entity.Utilisateur;
import cm.mboaride.enums.StatutCourse;
import cm.mboaride.enums.TypeReduction;
import cm.mboaride.enums.TypeTransaction;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.CodePromoRepository;
import cm.mboaride.repository.CourseRepository;
import cm.mboaride.repository.UtilisationPromoRepository;
import cm.mboaride.util.Montants;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Codes promotionnels et parrainage (BF-27). Les réductions sont prises en charge par la plateforme. */
@Service
@RequiredArgsConstructor
public class PromoService {
  private final CodePromoRepository codePromoRepository;
  private final UtilisationPromoRepository utilisationRepository;
  private final CourseRepository courseRepository;
  private final ParametreService parametres;
  private final PortefeuilleService portefeuille;
  private final NotificationService notifications;

  public record Reduction(long montant, CodePromo code, String libelle) {
    static Reduction aucune() {
      return new Reduction(0, null, null);
    }
  }

  /** Réduction applicable : code promo saisi, sinon réduction de bienvenue du filleul sur sa 1re course. */
  @Transactional(readOnly = true)
  public Reduction calculer(Utilisateur client, String code, long montant) {
    if (code != null && !code.isBlank()) {
      CodePromo promo = valider(client, code);
      long valeur = promo.getTypeReduction() == TypeReduction.POURCENTAGE
          ? Montants.arrondir25(montant * promo.getValeur() / 100.0)
          : promo.getValeur();
      if (promo.getReductionMax() != null) {
        valeur = Math.min(valeur, promo.getReductionMax());
      }
      return new Reduction(Math.min(valeur, montant), promo, promo.getCode());
    }
    if (client.getParrain() != null && !client.getParrainageRecompense()
        && courseRepository.countByClientIdAndStatut(client.getId(), StatutCourse.TERMINEE) == 0) {
      long valeur = parametres.entier(ParametreService.REDUCTION_FILLEUL);
      return new Reduction(Math.min(valeur, montant), null, "PARRAINAGE");
    }
    return Reduction.aucune();
  }

  public CodePromo valider(Utilisateur client, String code) {
    CodePromo promo = codePromoRepository.findByCodeIgnoreCase(code.trim())
        .orElseThrow(() -> ApiException.badRequest("promo.invalide"));
    LocalDateTime now = LocalDateTime.now();
    if (!promo.getActif() || (promo.getDateDebut() != null && now.isBefore(promo.getDateDebut()))
        || (promo.getDateFin() != null && now.isAfter(promo.getDateFin()))) {
      throw ApiException.badRequest("promo.expire");
    }
    if (promo.getUtilisationsMax() != null && promo.getUtilisations() >= promo.getUtilisationsMax()) {
      throw ApiException.badRequest("promo.epuise");
    }
    if (promo.getUneFoisParUtilisateur() && utilisationRepository.existsByCodePromoIdAndUtilisateurId(promo.getId(), client.getId())) {
      throw ApiException.badRequest("promo.deja_utilise");
    }
    return promo;
  }

  /** À la fin d'une course : comptabilise le code utilisé et récompense le parrain (1re course du filleul). */
  @Transactional
  public void apresCourseTerminee(Course course) {
    Utilisateur client = course.getClient();
    if (course.getCodePromo() != null) {
      CodePromo promo = course.getCodePromo();
      promo.setUtilisations(promo.getUtilisations() + 1);
      utilisationRepository.save(UtilisationPromo.builder().codePromoId(promo.getId()).utilisateurId(client.getId())
          .courseId(course.getId()).build());
    }
    if (client.getParrain() != null && !client.getParrainageRecompense()) {
      client.setParrainageRecompense(true);
      long bonus = parametres.entier(ParametreService.BONUS_PARRAIN);
      if (bonus > 0) {
        portefeuille.mouvement(client.getParrain().getId(), TypeTransaction.BONUS_PARRAINAGE, bonus, null,
            "Parrainage de " + client.getPrenom(), false);
        notifications.notifier(client.getParrain().getId(), "parrainage", null, false, client.getPrenom(), bonus);
      }
    }
  }
}
