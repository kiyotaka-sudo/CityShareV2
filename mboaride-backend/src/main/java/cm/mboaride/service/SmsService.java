package cm.mboaride.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Passerelle SMS (OTP, SOS, secours des notifications push).
 * Mode SIMULATION : le SMS est seulement journalisé. Mode TWILIO : envoi réel via l'API REST Twilio.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {
  private final RestClient restClient;

  @Value("${sms.mode:SIMULATION}") private String mode;
  @Value("${sms.twilio.account-sid:}") private String accountSid;
  @Value("${sms.twilio.auth-token:}") private String authToken;
  @Value("${sms.twilio.from-number:}") private String fromNumber;
  @Value("${sms.twilio.messaging-service-sid:}") private String messagingServiceSid;

  public boolean isSimulation() {
    return !"TWILIO".equalsIgnoreCase(mode) || accountSid.isBlank() || authToken.isBlank();
  }

  public String mode() {
    return isSimulation() ? "SIMULATION" : "TWILIO";
  }

  /** Envoie un SMS ; renvoie vrai si le message a été accepté par la passerelle. */
  public boolean envoyer(String telephone, String texte) {
    if (telephone == null || telephone.isBlank()) {
      return false;
    }
    if (isSimulation()) {
      log.info("[SMS simulé] → {} : {}", telephone, texte);
      return true;
    }
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("To", telephone);
    form.add("Body", texte);
    if (!messagingServiceSid.isBlank()) {
      form.add("MessagingServiceSid", messagingServiceSid);
    } else {
      form.add("From", fromNumber);
    }
    try {
      restClient.post()
          .uri("https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json", accountSid)
          .headers(h -> h.setBasicAuth(accountSid, authToken))
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(form)
          .retrieve()
          .toBodilessEntity();
      return true;
    } catch (Exception ex) {
      log.warn("Échec d'envoi SMS Twilio vers {} : {}", telephone, ex.getMessage());
      return false;
    }
  }
}
