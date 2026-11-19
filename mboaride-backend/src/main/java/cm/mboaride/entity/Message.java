package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Message échangé entre client et chauffeur pendant une course (BF-12). */
@Entity
@Table(name = "message")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "course_id") private Course course;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "expediteur_id") private Utilisateur expediteur;
  @Column(nullable = false, length = 1000) private String contenu;
  @Column(nullable = false) @Builder.Default private Boolean lu = false;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
