package cm.cityshare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
  private String token;
  @Builder.Default private String type = "Bearer";
  private Long userId;
  private String role;
  private String prenom;
  private String preferredLang;
  private UserResponse user;
}
