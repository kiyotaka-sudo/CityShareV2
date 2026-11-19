package cm.mboaride.util;

import cm.mboaride.exception.ApiException;

/** Normalisation des numéros camerounais au format international +237XXXXXXXXX. */
public final class Telephones {
  private Telephones() {}

  public static String normaliser(String brut) {
    if (brut == null) {
      throw ApiException.badRequest("telephone.invalide");
    }
    String chiffres = brut.replaceAll("\\D", "");
    if (chiffres.startsWith("00237")) {
      chiffres = chiffres.substring(5);
    } else if (chiffres.startsWith("237") && chiffres.length() == 12) {
      chiffres = chiffres.substring(3);
    }
    // Numéros camerounais : 9 chiffres, mobiles en 6, fixes en 2
    if (chiffres.length() != 9 || !(chiffres.startsWith("6") || chiffres.startsWith("2"))) {
      throw ApiException.badRequest("telephone.invalide");
    }
    return "+237" + chiffres;
  }

  /** Format attendu par les agrégateurs Mobile Money : 2376XXXXXXXX. */
  public static String sansPlus(String telephone) {
    return normaliser(telephone).substring(1);
  }

  /** Masque un numéro pour l'affichage public : +237 6** ** ** 12. */
  public static String masquer(String telephone) {
    if (telephone == null || telephone.length() < 6) {
      return telephone;
    }
    return telephone.substring(0, 6) + "*****" + telephone.substring(telephone.length() - 2);
  }
}
