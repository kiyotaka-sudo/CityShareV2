package cm.cityshare.dto.request;

import cm.cityshare.enums.RoleEnum;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
  @NotBlank private String nom;
  @NotBlank private String prenom;
  @NotBlank private String telephone;
  @Email private String email;
  @NotBlank private String password;
  @NotNull private RoleEnum role;
  private String preferredLang;
}
