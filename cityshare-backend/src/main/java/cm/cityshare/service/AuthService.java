package cm.cityshare.service;

import cm.cityshare.dto.request.LoginRequest;
import cm.cityshare.dto.request.RegisterRequest;
import cm.cityshare.dto.response.AuthResponse;
import cm.cityshare.dto.response.UserResponse;
import cm.cityshare.entity.Conducteur;
import cm.cityshare.entity.Expediteur;
import cm.cityshare.entity.Passager;
import cm.cityshare.entity.Utilisateur;
import cm.cityshare.enums.RoleEnum;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.exception.UnauthorizedException;
import cm.cityshare.repository.UtilisateurRepository;
import cm.cityshare.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
  private final UtilisateurRepository utilisateurRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtTokenProvider jwtTokenProvider;

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    if (utilisateurRepository.existsByTelephone(request.getTelephone())) {
      throw new IllegalArgumentException("Ce numéro est déjà utilisé");
    }
    Utilisateur user = createSubtype(request);
    user.setNom(request.getNom());
    user.setPrenom(request.getPrenom());
    user.setTelephone(request.getTelephone());
    user.setEmail(request.getEmail());
    user.setRole(request.getRole());
    user.setPreferredLang(request.getPreferredLang() == null ? "fr" : request.getPreferredLang());
    user.setMotDePasse(passwordEncoder.encode(request.getPassword()));
    Utilisateur saved = utilisateurRepository.save(user);
    return authResponse(saved);
  }

  public AuthResponse login(LoginRequest request) {
    authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.getTelephone(), request.getPassword()));
    Utilisateur user = utilisateurRepository.findByTelephone(request.getTelephone())
        .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    ensureRoleMatchesEntity(user);
    return authResponse(user);
  }

  public Utilisateur currentUser() {
    String telephone = SecurityContextHolder.getContext().getAuthentication().getName();
    Utilisateur user = utilisateurRepository.findByTelephone(telephone)
        .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    ensureRoleMatchesEntity(user);
    return user;
  }

  @Transactional
  public UserResponse updateProfile(java.util.Map<String, String> updates) {
    Utilisateur user = currentUser();
    if (updates.containsKey("nom")) user.setNom(updates.get("nom"));
    if (updates.containsKey("prenom")) user.setPrenom(updates.get("prenom"));
    if (updates.containsKey("email")) user.setEmail(updates.get("email"));
    if (user instanceof Passager passager) {
      if (updates.containsKey("contactUrgenceNom")) {
        passager.setContactUrgenceNom(updates.get("contactUrgenceNom"));
      }
      if (updates.containsKey("contactUrgenceTel")) {
        passager.setContactUrgenceTel(updates.get("contactUrgenceTel"));
      }
    }
    return toUserResponse(utilisateurRepository.save(user));
  }

  @Transactional
  public UserResponse updateFcmToken(String fcmToken) {
    Utilisateur user = currentUser();
    user.setFcmToken(fcmToken);
    return toUserResponse(utilisateurRepository.save(user));
  }

  @Transactional
  public UserResponse updatePhoto(String photoUrl) {
    Utilisateur user = currentUser();
    user.setPhotoUrl(photoUrl);
    return toUserResponse(utilisateurRepository.save(user));
  }

  public UserResponse toUserResponse(Utilisateur user) {
    UserResponse.UserResponseBuilder builder = UserResponse.builder()
        .id(user.getId())
        .nom(user.getNom())
        .prenom(user.getPrenom())
        .telephone(user.getTelephone())
        .email(user.getEmail())
        .role(user.getRole())
        .noteMoyenne(user.getNoteMoyenne())
        .photoUrl(user.getPhotoUrl())
        .preferredLang(user.getPreferredLang());
    if (user instanceof Conducteur conducteur) {
      builder.verifie(conducteur.getVerifie())
          .vehiculeMarque(conducteur.getVehiculeMarque())
          .vehiculeImmatriculation(conducteur.getVehiculeImmatriculation());
    }
    if (user instanceof Passager passager) {
      builder.contactUrgenceNom(passager.getContactUrgenceNom())
          .contactUrgenceTel(passager.getContactUrgenceTel());
    }
    return builder.build();
  }

  private AuthResponse authResponse(Utilisateur user) {
    return AuthResponse.builder()
        .token(jwtTokenProvider.generateToken(user))
        .type("Bearer")
        .userId(user.getId())
        .role(user.getRole().name())
        .prenom(user.getPrenom())
        .preferredLang(user.getPreferredLang())
        .user(toUserResponse(user))
        .build();
  }

  private Utilisateur createSubtype(RegisterRequest request) {
    if (request.getRole() == RoleEnum.CONDUCTEUR) return new Conducteur();
    if (request.getRole() == RoleEnum.EXPEDITEUR) return new Expediteur();
    return new Passager();
  }

  private void ensureRoleMatchesEntity(Utilisateur user) {
    if (user.getRole() == RoleEnum.CONDUCTEUR && !(user instanceof Conducteur)) {
      throw new UnauthorizedException(
          "Ce compte n'est pas configuré comme conducteur. Déconnectez-vous et créez un compte avec le rôle Conducteur.");
    }
    if (user.getRole() == RoleEnum.PASSAGER && !(user instanceof Passager)) {
      throw new UnauthorizedException(
          "Ce compte n'est pas configuré comme passager. Déconnectez-vous et créez un compte avec le rôle Passager.");
    }
    if (user.getRole() == RoleEnum.EXPEDITEUR && !(user instanceof Expediteur)) {
      throw new UnauthorizedException(
          "Ce compte n'est pas configuré comme expéditeur. Déconnectez-vous et créez un compte avec le rôle Expéditeur.");
    }
  }
}
