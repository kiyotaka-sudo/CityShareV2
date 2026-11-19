package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Point GPS enregistré pendant une course (suivi, détection d'anomalies). */
@Entity
@Table(name = "course_position")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CoursePosition {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "course_id", nullable = false) private Long courseId;
  @Column(nullable = false) private Double latitude;
  @Column(nullable = false) private Double longitude;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
