package cm.cityshare.security;

import cm.cityshare.entity.Utilisateur;
import cm.cityshare.repository.UtilisateurRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
  private final UtilisateurRepository utilisateurRepository;

  @Override
  public UserDetails loadUserByUsername(String telephone) {
    Utilisateur user = utilisateurRepository.findByTelephone(telephone)
        .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));
    return new User(user.getTelephone(), user.getMotDePasse(), List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
  }
}
