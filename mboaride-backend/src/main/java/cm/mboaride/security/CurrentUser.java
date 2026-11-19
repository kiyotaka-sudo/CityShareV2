package cm.mboaride.security;

import cm.mboaride.entity.Utilisateur;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Accès à l'utilisateur de la requête en cours. */
@Component
@RequiredArgsConstructor
public class CurrentUser {
  private final UtilisateurRepository utilisateurRepository;

  public AuthUser auth() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
      throw ApiException.unauthorized("auth.requise");
    }
    return user;
  }

  public Long id() {
    return auth().id();
  }

  public Utilisateur get() {
    return utilisateurRepository.findById(id()).orElseThrow(() -> ApiException.unauthorized("auth.requise"));
  }
}
