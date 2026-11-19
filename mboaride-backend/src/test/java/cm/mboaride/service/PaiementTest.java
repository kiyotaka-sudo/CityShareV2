package cm.mboaride.service;

import static org.assertj.core.api.Assertions.assertThat;

import cm.mboaride.entity.Course;
import cm.mboaride.enums.StatutCourse;
import cm.mboaride.enums.TypeService;
import cm.mboaride.service.paiement.PaiementService;
import org.junit.jupiter.api.Test;

/** Commission plateforme et montant dû (BF-40). */
class PaiementTest {
  @Test
  void commissionEnPourcentageArrondieA25() {
    assertThat(PaiementService.commission(TypeService.DEPOT, 2100, 1, 15, 25)).isEqualTo(325);
    assertThat(PaiementService.commission(TypeService.MOTO, 700, 1, 15, 25)).isEqualTo(100);
  }

  @Test
  void commissionRamassageFixeParPlace() {
    assertThat(PaiementService.commission(TypeService.RAMASSAGE, 1050, 3, 15, 25)).isEqualTo(75);
  }

  @Test
  void montantAPayerDeduitLaReduction() {
    Course c = Course.builder().prixPropose(2000L).prixFinal(2100L).reduction(500L).statut(StatutCourse.TERMINEE).build();
    assertThat(c.getMontantAPayer()).isEqualTo(1600);
    c.setReduction(5000L);
    assertThat(c.getMontantAPayer()).isZero();
  }
}
