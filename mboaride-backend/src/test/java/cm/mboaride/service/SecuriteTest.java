package cm.mboaride.service;

import static org.assertj.core.api.Assertions.assertThat;

import cm.mboaride.entity.Course;
import org.junit.jupiter.api.Test;

/** Détection de déviation (BF-46). */
class SecuriteTest {
  private final Course course = Course.builder().departLat(3.8960).departLng(11.5090).arriveeLat(3.8667).arriveeLng(11.5167).build();

  @Test
  void positionSurLeTrajetNEstPasUneDeviation() {
    assertThat(SecuriteService.estDevie(course, 3.8810, 11.5130, 2)).isFalse();
  }

  @Test
  void grandDetourEstUneDeviation() {
    assertThat(SecuriteService.estDevie(course, 3.9500, 11.6000, 2)).isTrue();
  }
}
