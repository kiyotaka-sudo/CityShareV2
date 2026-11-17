package cm.cityshare.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ErrorResponse {
  private String messageFr;
  private String messageEn;
  private int status;
  private String timestamp;
  private List<String> errors;

  public static ErrorResponse of(String fr, String en, int status) {
    return ErrorResponse.builder()
        .messageFr(fr)
        .messageEn(en)
        .status(status)
        .timestamp(LocalDateTime.now().toString())
        .build();
  }
}
