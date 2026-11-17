package cm.cityshare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentInitResponse {
  private Long paiementId;
  private String paymentRef;
  private String paymentUrl;
  private String statut;
  private Double montant;
  private String devise;
  private String operateur;
}
