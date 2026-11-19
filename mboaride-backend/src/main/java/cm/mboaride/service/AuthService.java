package cm.mboaride.service;

import cm.mboaride.dto.UserDtos.*;
import cm.mboaride.entity.Utilisateur;
import cm.mboaride.enums.Role;
import cm.mboaride.enums.StatutCompte;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.UtilisateurRepository;
import cm.mboaride.security.JwtTokenProvider;
import cm.mboaride.util.Codes;
import cm.mboaride.util.Telephones;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Connexion par OTP pour l'application mobile (clients et chauffeurs) et par mot de passe pour le back-office.
 * Un numéro inconnu crée un compte client ; les comptes chauffeurs sont créés par l'administration.
 */
@Service
@RequiredArgsConstructor
public class AuthService {
  private final UtilisateurRepository utilisateurRepository;
  private final OtpService otpService;
  private final JwtTokenProvider tokenProvider;
  private final PasswordEncoder passwordEncoder;
  private final ProfilService profilService;

  public OtpDemandeReponse demanderOtp(OtpDemande demande) {
    String telephone = Telephones.normaliser(demande.telephone());
    var existant = utilisateurRepository.findByTelephone(telephone);
    existant.ifPresent(u -> {
      if (u.getRole() == Role.ADMIN || u.getRole() == Role.SUPPORT) {
        throw ApiException.forbidden("auth.compte_backoffice");
      }
    });
    String langue = existant.map(Utilisateur::getLangue).orElse("fr");
    String codeDev = otpService.envoyer(telephone, langue);
    return new OtpDemandeReponse(true, OtpService.DUREE_SECONDES, existant.isEmpty(), codeDev);
  }

  @Transactional
  public AuthReponse verifierOtp(OtpVerification req) {
    String telephone = Telephones.normaliser(req.telephone());
    otpService.verifier(telephone, req.code());
    Utilisateur user = utilisateurRepository.findByTelephone(telephone).orElse(null);
    if (user == null) {
      user = inscrireClient(telephone, req);
    }
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.SUPPORT) {
      throw ApiException.forbidden("auth.compte_backoffice");
    }
    user.setDerniereConnexion(LocalDateTime.now());
    return new AuthReponse(tokenProvider.generer(user), profilService.toDto(user));
  }

  private Utilisateur inscrireClient(String telephone, OtpVerification req) {
    if (req.nom() == null || req.nom().isBlank() || req.prenom() == null || req.prenom().isBlank()) {
      throw ApiException.badRequest("inscription.nom_requis");
    }
    if (!Boolean.TRUE.equals(req.consentement())) {
      throw ApiException.badRequest("inscription.consentement_requis");
    }
    Utilisateur parrain = null;
    if (req.codeParrainage() != null && !req.codeParrainage().isBlank()) {
      parrain = utilisateurRepository.findByCodeParrainage(req.codeParrainage().trim().toUpperCase())
          .orElseThrow(() -> ApiException.badRequest("parrainage.code_invalide"));
    }
    Utilisateur user = Utilisateur.builder()
        .nom(req.nom().trim())
        .prenom(req.prenom().trim())
        .telephone(telephone)
        .role(Role.CLIENT)
        .statut(StatutCompte.ACTIF)
        .langue(req.langue() == null ? "fr" : req.langue())
        .codeParrainage(nouveauCodeParrainage())
        .parrain(parrain)
        .consentementAt(LocalDateTime.now())
        .build();
    return utilisateurRepository.save(user);
  }

  @Transactional
  public AuthReponse connexionAdmin(AdminLogin req) {
    String identifiant = req.identifiant().trim();
    Utilisateur user = (identifiant.contains("@")
        ? utilisateurRepository.findByEmailIgnoreCase(identifiant)
        : utilisateurRepository.findByTelephone(Telephones.normaliser(identifiant)))
        .orElseThrow(() -> ApiException.unauthorized("auth.identifiants"));
    if ((user.getRole() != Role.ADMIN && user.getRole() != Role.SUPPORT) || user.getMotDePasse() == null
        || !passwordEncoder.matches(req.motDePasse(), user.getMotDePasse())) {
      throw ApiException.unauthorized("auth.identifiants");
    }
    if (user.getStatut() != StatutCompte.ACTIF) {
      throw ApiException.forbidden("auth.compte_inactif");
    }
    user.setDerniereConnexion(LocalDateTime.now());
    // Session d'administration plus courte : 12 heures
    return new AuthReponse(tokenProvider.generer(user, 12L * 3600 * 1000), profilService.toDto(user));
  }

  public String nouveauCodeParrainage() {
    String code;
    do {
      code = "MR" + Codes.alphanum(6);
    } while (utilisateurRepository.existsByCodeParrainage(code));
    return code;
  }
}
