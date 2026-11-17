package cm.cityshare.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "conducteur")
@DiscriminatorValue("CONDUCTEUR")
@PrimaryKeyJoinColumn(name = "id")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Conducteur extends Utilisateur {
  @Column(name = "permis_conduire")
  private String permisConduire;
  @Column(name = "carte_grise")
  private String carteGrise;
  @Column(name = "vehicule_marque")
  private String vehiculeMarque;
  @Column(name = "vehicule_immatriculation")
  private String vehiculeImmatriculation;
  @Column(name = "vehicule_photo_url")
  private String vehiculePhotoUrl;
  @Column(name = "verifie")
  private Boolean verifie = false;

  @OneToMany(mappedBy = "conducteur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
  @JsonIgnore
  private List<Trajet> trajets = new ArrayList<>();
}
