package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Demande écartée par un chauffeur : elle ne lui est plus proposée. */
@Entity
@Table(name = "course_ignoree")
@IdClass(CourseIgnoreeId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CourseIgnoree {
  @Id @Column(name = "course_id") private Long courseId;
  @Id @Column(name = "chauffeur_id") private Long chauffeurId;
}
