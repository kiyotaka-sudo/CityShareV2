package cm.mboaride.service;

import cm.mboaride.entity.OtpCode;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.OtpCodeRepository;
import cm.mboaride.util.Codes;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Codes à usage unique envoyés par SMS (BF-01). Stockés hachés, 5 minutes, 5 essais. */
@Service
@RequiredArgsConstructor
public class OtpService {
  public static final int DUREE_SECONDES = 300;
  private static final int MAX_ESSAIS = 5;
  private static final int MAX_ENVOIS_PAR_HEURE = 5;

  private final OtpCodeRepository repository;
  private final PasswordEncoder encoder;
  private final SmsService smsService;

  /** Génère et envoie un code ; renvoie le code en clair uniquement en mode simulation (développement). */
  @Transactional
  public String envoyer(String telephone, String langue) {
    if (repository.countByTelephoneAndCreatedAtAfter(telephone, LocalDateTime.now().minusHours(1)) >= MAX_ENVOIS_PAR_HEURE) {
      throw ApiException.tooMany("otp.trop_demandes");
    }
    repository.findTopByTelephoneAndUtiliseFalseOrderByCreatedAtDesc(telephone).ifPresent(o -> o.setUtilise(true));
    String code = Codes.chiffres(6);
    repository.save(OtpCode.builder().telephone(telephone).codeHash(encoder.encode(code))
        .expireAt(LocalDateTime.now().plusSeconds(DUREE_SECONDES)).build());
    String texte = "en".equals(langue)
        ? "Your MboaRide code is " + code + ". It expires in 5 minutes. Never share it."
        : "Votre code MboaRide est " + code + ". Il expire dans 5 minutes. Ne le partagez jamais.";
    if (!smsService.envoyer(telephone, texte)) {
      throw ApiException.badRequest("otp.envoi_echec");
    }
    return smsService.isSimulation() ? code : null;
  }

  @Transactional(noRollbackFor = ApiException.class)
  public void verifier(String telephone, String code) {
    OtpCode otp = repository.findTopByTelephoneAndUtiliseFalseOrderByCreatedAtDesc(telephone)
        .orElseThrow(() -> ApiException.badRequest("otp.invalide"));
    if (otp.getExpireAt().isBefore(LocalDateTime.now())) {
      otp.setUtilise(true);
      throw ApiException.badRequest("otp.expire");
    }
    if (otp.getTentatives() >= MAX_ESSAIS) {
      otp.setUtilise(true);
      throw ApiException.badRequest("otp.trop_essais");
    }
    otp.setTentatives(otp.getTentatives() + 1);
    if (!encoder.matches(code, otp.getCodeHash())) {
      throw ApiException.badRequest("otp.invalide");
    }
    otp.setUtilise(true);
  }
}
