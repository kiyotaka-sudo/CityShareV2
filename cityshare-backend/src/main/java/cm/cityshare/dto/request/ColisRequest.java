package cm.cityshare.dto.request;

import cm.cityshare.enums.ColisPoidsEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ColisRequest {
  private Long trajetId;
  private Long conducteurId;
  @NotBlank private String description;
  @NotNull private ColisPoidsEnum poids;
  @NotBlank private String villeDepart;
  @NotBlank private String villeArrivee;
  private Double latDepart;
  private Double lngDepart;
  private Double latArrivee;
  private Double lngArrivee;
  private Double prixLivraison;
}
