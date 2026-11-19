package cm.mboaride.controller;

import cm.mboaride.service.paiement.PaiementService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Notifications des agrégateurs de paiement. Le contenu n'est jamais cru sur parole : il est revérifié. */
@RestController
@RequestMapping("/api/paiements/webhook")
@RequiredArgsConstructor
public class WebhookController {
  private final PaiementService paiementService;

  @RequestMapping(value = "/monetbil", method = {RequestMethod.GET, RequestMethod.POST})
  public String monetbil(@RequestParam Map<String, String> params) {
    paiementService.webhookMonetbil(params);
    return "OK";
  }

  @RequestMapping(value = "/campay", method = {RequestMethod.GET, RequestMethod.POST})
  public String campay(@RequestParam Map<String, String> params) {
    paiementService.webhookCampay(params);
    return "OK";
  }
}
