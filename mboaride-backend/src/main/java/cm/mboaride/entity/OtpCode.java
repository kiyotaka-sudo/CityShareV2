package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Code OTP envoyé par SMS (stocké haché). */
@Entity
@Table(name = "otp_code")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OtpCode {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, length = 20) private String telephone;
  @Column(name = "code_hash", nullable = false, length = 100) private String codeHash;
  @Column(name = "expire_at", nullable = false) private LocalDateTime expireAt;
  @Column(nullable = false) @Builder.Default private Integer tentatives = 0;
  @Column(nullable = false) @Builder.Default private Boolean utilise = false;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
