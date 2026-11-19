package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Journal des actions d'administration (BNF-06). */
@Entity
@Table(name = "journal_admin")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class JournalAdmin {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "admin_id") private Long adminId;
  @Column(name = "admin_nom", length = 200) private String adminNom;
  @Column(nullable = false, length = 60) private String action;
  @Column(name = "cible_type", length = 40) private String cibleType;
  @Column(name = "cible_id") private Long cibleId;
  @Column(columnDefinition = "TEXT") private String details;
  @Column(length = 60) private String ip;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
