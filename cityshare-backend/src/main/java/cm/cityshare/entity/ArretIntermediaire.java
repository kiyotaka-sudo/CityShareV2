package cm.cityshare.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "arret_intermediaire")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArretIntermediaire {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "trajet_id", nullable = false)
  @JsonIgnore
  private Trajet trajet;

  @Column(nullable = false)
  private String ville;
  private Double latitude;
  private Double longitude;
  @Column(nullable = false)
  private Integer ordre;
  @Column(name = "heure_passage")
  private LocalTime heurePassage;
}
