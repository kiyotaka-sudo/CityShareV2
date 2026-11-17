package cm.cityshare.controller;

import cm.cityshare.dto.response.UserResponse;
import cm.cityshare.entity.Utilisateur;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.repository.UtilisateurRepository;
import cm.cityshare.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
  private final UtilisateurRepository utilisateurRepository;
  private final AuthService authService;

  @GetMapping("/{userId}")
  public ResponseEntity<UserResponse> getUser(@PathVariable Long userId) {
    Utilisateur user = utilisateurRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    return ResponseEntity.ok(authService.toUserResponse(user));
  }
}
