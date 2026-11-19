package cm.mboaride.service.paiement;

import cm.mboaride.entity.Paiement;
import cm.mboaride.entity.Retrait;
import cm.mboaride.enums.FournisseurPaiement;
import cm.mboaride.enums.StatutPaiement;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

/** Paiement simulé pour la démonstration : confirmé automatiquement après 5 secondes. */
@Component
public class SimulationClient implements FournisseurPaiementClient {
  @Override
  public FournisseurPaiement type() {
    return FournisseurPaiement.SIMULATION;
  }

  @Override
  public boolean configure() {
    return true;
  }

  @Override
  public void initier(Paiement paiement) {
    paiement.setReferenceExterne("SIM-" + paiement.getReference());
    paiement.setMessage("Paiement simulé : validation automatique dans quelques secondes");
  }

  @Override
  public StatutPaiement verifier(Paiement paiement) {
    return paiement.getCreatedAt().isBefore(LocalDateTime.now().minusSeconds(5)) ? StatutPaiement.REUSSI : StatutPaiement.EN_ATTENTE;
  }

  @Override
  public boolean supporteRetrait() {
    return true;
  }

  @Override
  public StatutPaiement retirer(Retrait retrait) {
    retrait.setReferenceExterne("SIM-" + retrait.getReference());
    return StatutPaiement.REUSSI;
  }
}
