package cm.mboaride.util;

import java.security.SecureRandom;

/** Génération de codes aléatoires (références, OTP, codes de vérification). */
public final class Codes {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final String ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  private Codes() {}

  public static String chiffres(int longueur) {
    StringBuilder sb = new StringBuilder(longueur);
    for (int i = 0; i < longueur; i++) {
      sb.append(RANDOM.nextInt(10));
    }
    return sb.toString();
  }

  public static String alphanum(int longueur) {
    StringBuilder sb = new StringBuilder(longueur);
    for (int i = 0; i < longueur; i++) {
      sb.append(ALPHANUM.charAt(RANDOM.nextInt(ALPHANUM.length())));
    }
    return sb.toString();
  }

  public static String token() {
    byte[] bytes = new byte[18];
    RANDOM.nextBytes(bytes);
    return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }
}
