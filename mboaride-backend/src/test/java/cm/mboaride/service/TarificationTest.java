package cm.mboaride.service;

import static org.assertj.core.api.Assertions.assertThat;

import cm.mboaride.entity.Tarif;
import cm.mboaride.enums.TypeService;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

/** Calcul du prix de référence et de la fourchette de négociation (section 5.5). */
class TarificationTest {
  private final Tarif depot = Tarif.builder().typeService(TypeService.DEPOT).priseEnCharge(500L).prixKm(250L)
      .prixMinute(25L).prixMinimum(1500L).build();
  private final Tarif ramassage = Tarif.builder().typeService(TypeService.RAMASSAGE).priseEnCharge(0L).prixKm(0L)
      .prixMinute(0L).prixMinimum(350L).prixPlace(350L).distanceIncluseKm(6.0).supplementKm(50L).build();

  @Test
  void prixReferenceAppliqueLaFormuleEtArrondiA50() {
    // 500 + 6 km × 250 + 15 min × 25 = 2375 → 2400
    assertThat(TarificationService.prixReference(depot, 6, 15, 0)).isEqualTo(2400);
  }

  @Test
  void prixReferenceAppliqueLesMajorations() {
    // 2375 × 1,20 = 2850
    assertThat(TarificationService.prixReference(depot, 6, 15, 20)).isEqualTo(2850);
  }

  @Test
  void prixReferenceNeDescendPasSousLeMinimum() {
    assertThat(TarificationService.prixReference(depot, 0.5, 2, 0)).isEqualTo(1500);
  }

  @Test
  void fourchetteAlphaBeta() {
    long[] bornes = TarificationService.fourchette(2000, 0.15, 0.30);
    assertThat(bornes).containsExactly(1700, 2600);
    assertThat(TarificationService.dansFourchette(1700, bornes[0], bornes[1])).isTrue();
    assertThat(TarificationService.dansFourchette(1650, bornes[0], bornes[1])).isFalse();
    assertThat(TarificationService.dansFourchette(2650, bornes[0], bornes[1])).isFalse();
  }

  @Test
  void ramassageTarifOfficielPuisSupplementKilometrique() {
    assertThat(TarificationService.prixPlaceRamassage(ramassage, 4)).isEqualTo(350);
    // 350 + (10 − 6) × 50 = 550
    assertThat(TarificationService.prixPlaceRamassage(ramassage, 10)).isEqualTo(550);
  }

  @Test
  void plagesHorairesGerentLePassageDeMinuit() {
    LocalTime debut = LocalTime.of(22, 0);
    LocalTime fin = LocalTime.of(5, 30);
    assertThat(ParametreService.dansPlage(LocalTime.of(23, 15), debut, fin)).isTrue();
    assertThat(ParametreService.dansPlage(LocalTime.of(2, 0), debut, fin)).isTrue();
    assertThat(ParametreService.dansPlage(LocalTime.of(12, 0), debut, fin)).isFalse();
    assertThat(ParametreService.dansPlage(LocalTime.of(7, 0), LocalTime.of(6, 30), LocalTime.of(8, 30))).isTrue();
  }
}
