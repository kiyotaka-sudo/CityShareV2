package cm.cityshare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ArretRequest {
  @NotBlank private String ville;
  private Double latitude;
  private Double longitude;
  @NotNull private Integer ordre;
  private LocalTime heurePassage;
}
