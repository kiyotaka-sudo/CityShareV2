package cm.mboaride.security;

import cm.mboaride.entity.Utilisateur;
import cm.mboaride.enums.StatutCompte;
import cm.mboaride.repository.UtilisateurRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Authentifie la requête à partir de l'en-tête « Authorization: Bearer … ». */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtTokenProvider tokenProvider;
  private final UtilisateurRepository utilisateurRepository;

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
      tokenProvider.lire(header.substring(7)).ifPresent(auth -> {
        // Le rôle et le statut sont relus en base : une suspension prend effet immédiatement
        Utilisateur user = utilisateurRepository.findById(auth.id()).orElse(null);
        if (user != null && user.getStatut() != StatutCompte.SUPPRIME) {
          AuthUser principal = new AuthUser(user.getId(), user.getRole(), user.getTelephone());
          var authentication = new UsernamePasswordAuthenticationToken(principal, null,
              List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
          SecurityContextHolder.getContext().setAuthentication(authentication);
        }
      });
    }
    chain.doFilter(request, response);
  }
}
