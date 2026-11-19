package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Paramètre métier clé/valeur modifiable par l'administrateur. */
@Entity
@Table(name = "parametre")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Parametre {
  @Id @Column(length = 80) private String cle;
  @Column(nullable = false) private String valeur;
  private String description;
  @Column(name = "updated_at") private LocalDateTime updatedAt;
}
