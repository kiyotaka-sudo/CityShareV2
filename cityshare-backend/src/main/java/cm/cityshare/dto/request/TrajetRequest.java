package cm.cityshare.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TrajetRequest {
  @NotBlank private String villeDepart;
  @NotBlank private String villeArrivee;
  private Double latDepart;
  private Double lngDepart;
  private Double latArrivee;
  private Double lngArrivee;
  @FutureOrPresent @NotNull private LocalDateTime dateHeure;
  @Min(1) @NotNull private Integer nbPlacesTotal;
  @Min(0) @NotNull private Double prixParPlace;
  private Boolean accepteColis = false;
  private Boolean autoriseArrets = false;
  @Valid private List<ArretRequest> arrets = new ArrayList<>();
}
