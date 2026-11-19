package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Historique des notifications envoyées à un utilisateur. */
@Entity
@Table(name = "notification")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "utilisateur_id", nullable = false) private Long utilisateurId;
  @Column(nullable = false, length = 150) private String titre;
  @Column(nullable = false, length = 500) private String corps;
  @Column(nullable = false, length = 30) private String type;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private CanalNotification canal;
  @Column(nullable = false) @Builder.Default private Boolean lu = false;
  @Column(name = "course_id") private Long courseId;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
