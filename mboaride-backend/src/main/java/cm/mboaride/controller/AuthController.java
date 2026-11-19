package cm.mboaride.controller;

import cm.mboaride.dto.UserDtos.*;
import cm.mboaride.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Connexion : OTP par SMS pour l'application, mot de passe pour le back-office. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
  private final AuthService authService;

  @PostMapping("/otp/demander")
  public OtpDemandeReponse demanderOtp(@Valid @RequestBody OtpDemande req) {
    return authService.demanderOtp(req);
  }

  @PostMapping("/otp/verifier")
  public AuthReponse verifierOtp(@Valid @RequestBody OtpVerification req) {
    return authService.verifierOtp(req);
  }

  /** Renouvelle le jeton de l'utilisateur connecté (session qui dure jusqu'à la déconnexion). */
  @PostMapping("/renouveler")
  public AuthReponse renouveler() {
    return authService.renouveler();
  }

  @PostMapping("/admin/login")
  public AuthReponse connexionAdmin(@Valid @RequestBody AdminLogin req) {
    return authService.connexionAdmin(req);
  }
}
