package cm.cityshare.dto.response;

import cm.cityshare.enums.StatutTrajet;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TrajetResponse {
  private Long id;
  private UserResponse conducteur;
  private String villeDepart;
  private String villeArrivee;
  private LocalDateTime dateHeure;
  private Integer nbPlacesDispo;
  private Double prixParPlace;
  private Boolean accepteColis;
  private StatutTrajet statut;
  private List<?> arrets;
}
