package cm.mboaride.util;

/** Arrondis monétaires en FCFA. */
public final class Montants {
  private Montants() {}

  /** Arrondit au multiple de 50 FCFA le plus proche (pas de petite monnaie en dessous). */
  public static long arrondir50(double montant) {
    return Math.round(montant / 50.0) * 50L;
  }

  /** Arrondit au multiple de 25 FCFA le plus proche. */
  public static long arrondir25(double montant) {
    return Math.round(montant / 25.0) * 25L;
  }
}
