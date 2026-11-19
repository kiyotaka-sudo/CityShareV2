package cm.mboaride.service.carto;

import static org.assertj.core.api.Assertions.assertThat;

import cm.mboaride.util.Geo;
import org.junit.jupiter.api.Test;

/** Anonymisation des positions des chauffeurs affichées sur la carte d'accueil. */
class VehiculesProchesTest {
  @Test
  void arrondiAEnvironDixMetres() {
    assertThat(VehiculesProchesService.arrondir(3.866712345)).isEqualTo(3.8667);
    assertThat(VehiculesProchesService.arrondir(11.51678)).isEqualTo(11.5168);
  }

  @Test
  void decalageMaximalResteSousCentMetres() {
    double km = Geo.distanceKm(3.8667, 11.5167, 3.8667 + VehiculesProchesService.DECALAGE_DEG, 11.5167 + VehiculesProchesService.DECALAGE_DEG);
    assertThat(km).isBetween(0.05, 0.1);
  }

  @Test
  void capVersLEstVaut90Degres() {
    assertThat(Geo.cap(3.8667, 11.5167, 3.8667, 11.5267)).isBetween(89.0, 91.0);
  }
}
