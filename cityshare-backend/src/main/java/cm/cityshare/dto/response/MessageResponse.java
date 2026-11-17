package cm.cityshare.dto.response;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
  private Long id;
  private Long expediteurId;
  private Long destinataireId;
  private String contenu;
  private LocalDateTime dateEnvoi;
  private String conversationId;
}
