package cm.mboaride.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cm.mboaride.exception.ApiException;
import org.junit.jupiter.api.Test;

class UtilsTest {
  @Test
  void normalisationDesNumerosCamerounais() {
    assertThat(Telephones.normaliser("690 00 00 01")).isEqualTo("+237690000001");
    assertThat(Telephones.normaliser("+237 6 90 00 00 01")).isEqualTo("+237690000001");
    assertThat(Telephones.normaliser("00237690000001")).isEqualTo("+237690000001");
    assertThatThrownBy(() -> Telephones.normaliser("12345")).isInstanceOf(ApiException.class);
  }

  @Test
  void distanceEtCap() {
    double km = Geo.distanceKm(3.8960, 11.5090, 3.8667, 11.5167);
    assertThat(km).isBetween(3.2, 3.5);
    assertThat(Geo.ecartAngulaire(350, 10)).isEqualTo(20);
    assertThat(Geo.cap(3.0, 11.0, 4.0, 11.0)).isLessThan(1);
  }

  @Test
  void arrondis() {
    assertThat(Montants.arrondir50(2374)).isEqualTo(2350);
    assertThat(Montants.arrondir50(2375)).isEqualTo(2400);
    assertThat(Montants.arrondir25(312.4)).isEqualTo(300);
  }
}
