package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Campagne de notification envoyée par l'administration (BF-63). */
@Entity
@Table(name = "campagne_notification")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CampagneNotification {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, length = 150) private String titre;
  @Column(nullable = false, length = 500) private String message;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) private CibleCampagne cible;
  @Column(name = "avec_sms", nullable = false) @Builder.Default private Boolean avecSms = false;
  @Column(name = "nb_destinataires", nullable = false) @Builder.Default private Integer nbDestinataires = 0;
  @Column(name = "envoye_par") private Long envoyePar;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
