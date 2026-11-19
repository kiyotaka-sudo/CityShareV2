package cm.mboaride.service.paiement;

import cm.mboaride.config.AppProperties;
import cm.mboaride.entity.Paiement;
import cm.mboaride.enums.FournisseurPaiement;
import cm.mboaride.enums.ModePaiement;
import cm.mboaride.enums.StatutPaiement;
import cm.mboaride.util.Telephones;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Agrégateur Monetbil (widget de paiement). Le client est redirigé vers la page Monetbil ;
 * la confirmation arrive par notification (webhook) puis est vérifiée via l'API checkPayment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MonetbilClient implements FournisseurPaiementClient {
  private final RestClient restClient;
  private final AppProperties props;

  @Value("${monetbil.service-key:}") private String serviceKey;
  @Value("${monetbil.widget-url}") private String widgetUrl;
  @Value("${monetbil.check-url}") private String checkUrl;
  @Value("${monetbil.return-url}") private String returnUrl;

  @Override
  public FournisseurPaiement type() {
    return FournisseurPaiement.MONETBIL;
  }

  @Override
  public boolean configure() {
    return serviceKey != null && !serviceKey.isBlank();
  }

  @Override
  public void initier(Paiement p) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("amount", String.valueOf(p.getMontant()));
    form.add("phone", Telephones.sansPlus(p.getTelephone()));
    form.add("phone_lock", "false");
    form.add("operator", p.getMode() == ModePaiement.ORANGE_MONEY ? "CM_ORANGEMONEY" : "CM_MTNMOBILEMONEY");
    form.add("country", "CM");
    form.add("currency", "XAF");
    form.add("locale", "fr");
    form.add("payment_ref", p.getReference());
    form.add("item_ref", p.getCourse() != null ? p.getCourse().getReference() : "RECHARGE");
    form.add("user", String.valueOf(p.getUtilisateur().getId()));
    form.add("first_name", p.getUtilisateur().getPrenom());
    form.add("last_name", p.getUtilisateur().getNom());
    form.add("notify_url", props.publicUrl() + "/api/paiements/webhook/monetbil");
    form.add("return_url", returnUrl + "?ref=" + p.getReference());
    JsonNode res = restClient.post().uri(widgetUrl + "/" + serviceKey)
        .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
        .retrieve().body(JsonNode.class);
    if (res == null || !res.hasNonNull("payment_url")) {
      log.warn("Réponse Monetbil inattendue : {}", res);
      throw new IllegalStateException("Monetbil n'a pas renvoyé de page de paiement");
    }
    p.setPaymentUrl(res.get("payment_url").asText());
    p.setMessage("Terminez le paiement sur la page Monetbil");
  }

  @Override
  public StatutPaiement verifier(Paiement p) {
    if (p.getReferenceExterne() == null) {
      return StatutPaiement.EN_ATTENTE; // identifiant Monetbil connu seulement après la notification
    }
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("paymentId", p.getReferenceExterne());
    JsonNode res = restClient.post().uri(checkUrl).contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
        .retrieve().body(JsonNode.class);
    JsonNode tx = res == null ? null : res.path("transaction");
    if (tx == null || tx.isMissingNode() || !tx.has("status")) {
      return StatutPaiement.EN_ATTENTE;
    }
    int status = tx.get("status").asInt();
    // 1 = succès, 0 = échec, -1 = annulé
    return status == 1 ? StatutPaiement.REUSSI : StatutPaiement.ECHOUE;
  }
}
