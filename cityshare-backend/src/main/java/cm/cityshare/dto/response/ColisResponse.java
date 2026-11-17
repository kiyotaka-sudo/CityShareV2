package cm.cityshare.dto.response;

import cm.cityshare.enums.ColisPoidsEnum;
import cm.cityshare.enums.StatutColis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ColisResponse {
  private Long id;
  private UserResponse expediteur;
  private UserResponse conducteur;
  private TrajetResponse trajet;
  private String description;
  private ColisPoidsEnum poids;
  private String villeDepart;
  private String villeArrivee;
  private Double prixLivraison;
  private StatutColis statut;
}
