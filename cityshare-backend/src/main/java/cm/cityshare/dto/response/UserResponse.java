package cm.cityshare.dto.response;

import cm.cityshare.enums.RoleEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserResponse {
  private Long id;
  private String nom;
  private String prenom;
  private String telephone;
  private String email;
  private RoleEnum role;
  private Double noteMoyenne;
  private String photoUrl;
  private String preferredLang;
  private Boolean verifie;
  private String vehiculeMarque;
  private String vehiculeImmatriculation;
  private String contactUrgenceNom;
  private String contactUrgenceTel;
}
