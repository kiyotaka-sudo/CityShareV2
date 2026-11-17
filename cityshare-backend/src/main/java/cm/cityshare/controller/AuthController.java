package cm.cityshare.controller;

import cm.cityshare.dto.request.LoginRequest;
import cm.cityshare.dto.request.RegisterRequest;
import cm.cityshare.dto.response.AuthResponse;
import cm.cityshare.dto.response.UserResponse;
import cm.cityshare.service.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
  private final AuthService authService;

  @PostMapping("/register")
  public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    return ResponseEntity.ok(authService.login(request));
  }

  @GetMapping("/me")
  public ResponseEntity<UserResponse> me() {
    return ResponseEntity.ok(authService.toUserResponse(authService.currentUser()));
  }

  @PatchMapping("/me")
  public ResponseEntity<UserResponse> updateProfile(@RequestBody Map<String, String> updates) {
    return ResponseEntity.ok(authService.updateProfile(updates));
  }

  @PatchMapping("/me/photo")
  public ResponseEntity<UserResponse> updatePhoto(@RequestBody Map<String, String> body) {
    return ResponseEntity.ok(authService.updatePhoto(body.get("photoUrl")));
  }

  @PatchMapping("/me/fcm-token")
  public ResponseEntity<UserResponse> updateFcmToken(@RequestBody Map<String, String> body) {
    return ResponseEntity.ok(authService.updateFcmToken(body.get("fcmToken")));
  }
}
