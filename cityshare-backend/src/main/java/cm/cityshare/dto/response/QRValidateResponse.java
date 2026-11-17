package cm.cityshare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QRValidateResponse {
  private boolean valid;
  private String message;
  private ReservationResponse reservation;
}
