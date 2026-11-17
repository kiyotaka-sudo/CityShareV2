package cm.cityshare.init;

import cm.cityshare.entity.ArretIntermediaire;
import cm.cityshare.entity.Conducteur;
import cm.cityshare.entity.Expediteur;
import cm.cityshare.entity.Passager;
import cm.cityshare.entity.Trajet;
import cm.cityshare.enums.RoleEnum;
import cm.cityshare.enums.StatutTrajet;
import cm.cityshare.repository.TrajetRepository;
import cm.cityshare.repository.UtilisateurRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
  private final UtilisateurRepository utilisateurRepository;
  private final TrajetRepository trajetRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  public void run(String... args) {
    if (utilisateurRepository.count() > 0) return;
    Conducteur fatou = new Conducteur();
    fatou.setNom("Samba");
    fatou.setPrenom("Fatou");
    fatou.setTelephone("+237691000001");
    fatou.setEmail("fatou@cityshare.cm");
    fatou.setMotDePasse(passwordEncoder.encode("password"));
    fatou.setRole(RoleEnum.CONDUCTEUR);
    fatou.setVehiculeMarque("Toyota Camry");
    fatou.setVehiculeImmatriculation("21F-2001");
    fatou.setVerifie(true);
    fatou.setNoteMoyenne(4.9);
    fatou = (Conducteur) utilisateurRepository.save(fatou);

    Passager ernest = new Passager();
    ernest.setNom("Mbarga");
    ernest.setPrenom("Ernest");
    ernest.setTelephone("+237691000002");
    ernest.setEmail("ernest@cityshare.cm");
    ernest.setMotDePasse(passwordEncoder.encode("password"));
    ernest.setRole(RoleEnum.PASSAGER);
    ernest.setContactUrgenceNom("Marie Mbarga");
    ernest.setContactUrgenceTel("+237699000001");
    utilisateurRepository.save(ernest);

    Expediteur claire = new Expediteur();
    claire.setNom("Nguemo");
    claire.setPrenom("Claire");
    claire.setTelephone("+237691000003");
    claire.setEmail("claire@cityshare.cm");
    claire.setMotDePasse(passwordEncoder.encode("password"));
    claire.setRole(RoleEnum.EXPEDITEUR);
    claire.setRaisonSociale("Boutique Chez Claire");
    utilisateurRepository.save(claire);

    createTrip(fatou, "Yaoundé", "Ntui", LocalDateTime.now().plusDays(1).withHour(14).withMinute(15), 6000.0, 3, true, "Obala", LocalTime.of(15, 0));
    createTrip(fatou, "Yaoundé", "Obala", LocalDateTime.now().plusDays(1).withHour(16).withMinute(30), 4500.0, 4, false, null, null);
    createTrip(fatou, "Douala", "Bafia", LocalDateTime.now().plusDays(2).withHour(8).withMinute(0), 8000.0, 2, true, null, null);
  }

  private void createTrip(Conducteur conducteur, String depart, String arrivee, LocalDateTime dateHeure, Double prix, Integer places, Boolean colis, String arretVille, LocalTime arretHeure) {
    Trajet trajet = Trajet.builder()
        .conducteur(conducteur)
        .villeDepart(depart)
        .villeArrivee(arrivee)
        .dateHeure(dateHeure)
        .nbPlacesTotal(places)
        .nbPlacesDispo(places)
        .prixParPlace(prix)
        .accepteColis(colis)
        .autoriseArrets(arretVille != null)
        .statut(StatutTrajet.ACTIF)
        .build();
    if (arretVille != null) {
      trajet.getArrets().add(ArretIntermediaire.builder()
          .trajet(trajet)
          .ville(arretVille)
          .ordre(1)
          .heurePassage(arretHeure)
          .build());
    }
    trajetRepository.save(trajet);
  }
}
