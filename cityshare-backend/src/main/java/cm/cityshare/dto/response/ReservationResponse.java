package cm.cityshare.dto.response;

import cm.cityshare.enums.StatutReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ReservationResponse {
  private Long id;
  private TrajetResponse trajet;
  private UserResponse passager;
  private Integer nbPlaces;
  private Double prixTotal;
  private StatutReservation statut;
  private String qrCodeToken;
  private Boolean qrCodeScanne;
  private Boolean arriveeConfirmee;
}
