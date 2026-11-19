package cm.mboaride.entity;

import java.io.Serializable;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class CourseIgnoreeId implements Serializable {
  private Long courseId;
  private Long chauffeurId;
}
