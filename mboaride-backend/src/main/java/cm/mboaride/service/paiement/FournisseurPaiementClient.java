package cm.mboaride.service.paiement;

import cm.mboaride.entity.Paiement;
import cm.mboaride.entity.Retrait;
import cm.mboaride.enums.FournisseurPaiement;
import cm.mboaride.enums.StatutPaiement;

/** Connecteur vers un agrégateur Mobile Money (MTN MoMo et Orange Money). */
public interface FournisseurPaiementClient {
  FournisseurPaiement type();

  /** Les clés d'accès sont renseignées. */
  boolean configure();

  /**
   * Lance la collecte. Le client confirme sur son téléphone (USSD) ou sur la page de paiement renvoyée.
   * Met à jour referenceExterne, paymentUrl et message du paiement.
   */
  void initier(Paiement paiement);

  /** Interroge l'agrégateur sur l'état réel de la transaction. */
  StatutPaiement verifier(Paiement paiement);

  /** Virement des gains d'un chauffeur. Renvoie faux si l'agrégateur ne gère pas les retraits automatiques. */
  default boolean supporteRetrait() {
    return false;
  }

  default StatutPaiement retirer(Retrait retrait) {
    throw new UnsupportedOperationException();
  }

  default StatutPaiement verifierRetrait(Retrait retrait) {
    return StatutPaiement.EN_ATTENTE;
  }
}
