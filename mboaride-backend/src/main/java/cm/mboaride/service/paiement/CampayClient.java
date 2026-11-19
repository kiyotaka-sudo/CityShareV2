package cm.mboaride.service.paiement;

import cm.mboaride.entity.Paiement;
import cm.mboaride.entity.Retrait;
import cm.mboaride.enums.FournisseurPaiement;
import cm.mboaride.enums.StatutPaiement;
import cm.mboaride.util.Telephones;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Agrégateur CamPay : collecte par demande USSD envoyée au téléphone du client (confirmation par code PIN)
 * et retraits automatiques vers MTN MoMo / Orange Money.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CampayClient implements FournisseurPaiementClient {
  private final RestClient restClient;

  @Value("${campay.base-url}") private String baseUrl;
  @Value("${campay.username:}") private String username;
  @Value("${campay.password:}") private String password;

  private String token;
  private Instant tokenExpire = Instant.EPOCH;

  @Override
  public FournisseurPaiement type() {
    return FournisseurPaiement.CAMPAY;
  }

  @Override
  public boolean configure() {
    return username != null && !username.isBlank() && password != null && !password.isBlank();
  }

  private synchronized String token() {
    if (token == null || Instant.now().isAfter(tokenExpire)) {
      JsonNode res = restClient.post().uri(baseUrl + "/token/").contentType(MediaType.APPLICATION_JSON)
          .body(Map.of("username", username, "password", password)).retrieve().body(JsonNode.class);
      if (res == null || !res.hasNonNull("token")) {
        throw new IllegalStateException("Authentification CamPay impossible");
      }
      token = res.get("token").asText();
      long expire = res.path("expires_in").asLong(3600);
      tokenExpire = Instant.now().plusSeconds(Math.max(60, expire - 60));
    }
    return token;
  }

  @Override
  public void initier(Paiement p) {
    JsonNode res = restClient.post().uri(baseUrl + "/collect/")
        .header("Authorization", "Token " + token())
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("amount", String.valueOf(p.getMontant()), "currency", "XAF",
            "from", Telephones.sansPlus(p.getTelephone()),
            "description", p.getCourse() != null ? "Course MboaRide " + p.getCourse().getReference() : "Recharge MboaRide",
            "external_reference", p.getReference()))
        .retrieve().body(JsonNode.class);
    if (res == null || !res.hasNonNull("reference")) {
      log.warn("Réponse CamPay inattendue : {}", res);
      throw new IllegalStateException("CamPay n'a pas accepté la demande de paiement");
    }
    p.setReferenceExterne(res.get("reference").asText());
    String ussd = res.path("ussd_code").asText("");
    p.setMessage(ussd.isBlank() ? "Confirmez le paiement sur votre téléphone"
        : "Confirmez le paiement sur votre téléphone (" + ussd + ")");
  }

  @Override
  public StatutPaiement verifier(Paiement p) {
    return statut(p.getReferenceExterne());
  }

  @Override
  public boolean supporteRetrait() {
    return true;
  }

  @Override
  public StatutPaiement retirer(Retrait r) {
    JsonNode res = restClient.post().uri(baseUrl + "/withdraw/")
        .header("Authorization", "Token " + token())
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("amount", String.valueOf(r.getMontant()), "currency", "XAF",
            "to", Telephones.sansPlus(r.getTelephone()),
            "description", "Retrait des gains MboaRide", "external_reference", r.getReference()))
        .retrieve().body(JsonNode.class);
    if (res == null || !res.hasNonNull("reference")) {
      throw new IllegalStateException("CamPay n'a pas accepté le retrait");
    }
    r.setReferenceExterne(res.get("reference").asText());
    return statut(r.getReferenceExterne());
  }

  @Override
  public StatutPaiement verifierRetrait(Retrait r) {
    return statut(r.getReferenceExterne());
  }

  private StatutPaiement statut(String reference) {
    if (reference == null) {
      return StatutPaiement.EN_ATTENTE;
    }
    JsonNode res = restClient.get().uri(baseUrl + "/transaction/" + reference + "/")
        .header("Authorization", "Token " + token()).retrieve().body(JsonNode.class);
    String status = res == null ? "" : res.path("status").asText("");
    return switch (status.toUpperCase()) {
      case "SUCCESSFUL" -> StatutPaiement.REUSSI;
      case "FAILED" -> StatutPaiement.ECHOUE;
      default -> StatutPaiement.EN_ATTENTE;
    };
  }
}
