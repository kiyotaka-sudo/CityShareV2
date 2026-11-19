package cm.mboaride.security;

import cm.mboaride.enums.Role;
import java.security.Principal;

/** Utilisateur authentifié (principal HTTP et WebSocket). Le nom = identifiant, utilisé pour /user/queue. */
public record AuthUser(Long id, Role role, String telephone) implements Principal {
  @Override
  public String getName() {
    return String.valueOf(id);
  }
}
