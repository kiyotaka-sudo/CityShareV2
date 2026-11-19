package cm.mboaride.controller;

import cm.mboaride.dto.CourseDtos.SuiviPublicDto;
import cm.mboaride.service.DocumentPdfService;
import cm.mboaride.service.SecuriteService;
import cm.mboaride.service.SmsService;
import cm.mboaride.service.paiement.PaiementService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Ressources publiques : suivi partagé (BF-44), reçus signés (BF-15), configuration de l'application. */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {
  private final SecuriteService securite;
  private final DocumentPdfService pdfService;
  private final SmsService smsService;
  private final PaiementService paiementService;

  @GetMapping("/suivi/{token}")
  public SuiviPublicDto suivi(@PathVariable String token) {
    return securite.suiviPublic(token);
  }

  @GetMapping("/recus/{id}.pdf")
  public ResponseEntity<byte[]> recu(@PathVariable Long id, @RequestParam("t") String token) {
    byte[] pdf = pdfService.recu(id, token);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=recu-mboaride-" + id + ".pdf")
        .contentType(MediaType.APPLICATION_PDF).body(pdf);
  }

  /** Informations utiles à l'application avant connexion. */
  @GetMapping("/config")
  public Map<String, Object> config() {
    return Map.of(
        "smsSimulation", smsService.isSimulation(),
        "paiement", paiementService.fournisseurActif().type().name(),
        "numeroSupport", "+237699000001",
        "numeroUrgence", "117",
        "villes", new String[] {"Yaoundé", "Douala"});
  }
}
