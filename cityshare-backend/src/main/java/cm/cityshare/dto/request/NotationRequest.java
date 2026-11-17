package cm.cityshare.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NotationRequest {
  private Long reservationId;
  private Long colisId;
  @NotNull private Long noteId;
  @Min(1) @Max(5) @NotNull private Integer note;
  private String commentaire;
  private List<String> criteres;
}
