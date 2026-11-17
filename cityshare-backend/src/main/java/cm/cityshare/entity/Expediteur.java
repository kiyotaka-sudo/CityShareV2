package cm.cityshare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "expediteur")
@DiscriminatorValue("EXPEDITEUR")
@PrimaryKeyJoinColumn(name = "id")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Expediteur extends Utilisateur {
  @Column(name = "type_expediteur")
  private String typeExpediteur;
  @Column(name = "raison_sociale")
  private String raisonSociale;
}
