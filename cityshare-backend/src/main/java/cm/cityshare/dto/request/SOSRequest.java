package cm.cityshare.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SOSRequest {
  private Double latitude;
  private Double longitude;
  private String adresseApprox;
  private String type;
}
