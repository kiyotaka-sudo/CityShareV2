package cm.mboaride.init;

import cm.mboaride.config.AppProperties;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.repository.*;
import cm.mboaride.service.AuthService;
import cm.mboaride.util.Codes;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Au premier démarrage : compte administrateur, agent du support et, si mboaride.demo-data=true,
 * des comptes et un historique de démonstration (connexion mobile par OTP, code affiché en mode SMS simulé).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DonneesInitiales implements CommandLineRunner {
  private final UtilisateurRepository utilisateurRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final VehiculeRepository vehiculeRepository;
  private final DocumentChauffeurRepository documentRepository;
  private final CourseRepository courseRepository;
  private final NotationRepository notationRepository;
  private final ContactConfianceRepository contactRepository;
  private final PasswordEncoder encoder;
  private final AuthService authService;
  private final AppProperties props;

  @Value("${mboaride.admin.email}") private String adminEmail;
  @Value("${mboaride.admin.password}") private String adminPassword;

  @Override
  @Transactional
  public void run(String... args) throws Exception {
    if (utilisateurRepository.findByEmailIgnoreCase(adminEmail).isEmpty()) {
      utilisateurRepository.save(Utilisateur.builder().nom("MboaRide").prenom("Administrateur").telephone("+237699000000")
          .email(adminEmail).motDePasse(encoder.encode(adminPassword)).role(Role.ADMIN).consentementAt(LocalDateTime.now()).build());
      utilisateurRepository.save(Utilisateur.builder().nom("Support").prenom("Agent").telephone("+237699000001")
          .email("support@mboaride.cm").motDePasse(encoder.encode(adminPassword)).role(Role.SUPPORT)
          .consentementAt(LocalDateTime.now()).build());
      log.warn("Compte administrateur créé : {} (mot de passe initial à changer dans le back-office)", adminEmail);
    }
    if (props.demoData() && utilisateurRepository.countByRole(Role.CLIENT) == 0) {
      creerDemo();
    }
  }

  private void creerDemo() throws Exception {
    Path placeholder = Path.of(props.uploadDir(), "prive", "demo", "document-demo.pdf");
    Files.createDirectories(placeholder.getParent());
    if (!Files.exists(placeholder)) {
      Files.write(placeholder, "%PDF-1.4\n% document de démonstration MboaRide\n%%EOF\n".getBytes());
    }

    Utilisateur ernest = client("Mbarga", "Ernest", "+237690000001", "H");
    Utilisateur aicha = client("Bello", "Aïcha", "+237690000002", "F");
    contactRepository.save(ContactConfiance.builder().utilisateur(aicha).nom("Fatima Bello").telephone("+237677000010").build());

    Utilisateur proprietaire = utilisateurRepository.save(Utilisateur.builder().nom("Ndongo").prenom("Paul")
        .telephone("+237691000010").role(Role.PROPRIETAIRE).codeParrainage(authService.nouveauCodeParrainage())
        .consentementAt(LocalDateTime.now()).build());

    Utilisateur jean = chauffeur("Atangana", "Jean", "+237691000001", "H", TypeVehicule.TAXI, proprietaire,
        "Toyota", "Corolla", "Jaune", "CE 123 AB", 4, 3.8740, 11.5150);
    Utilisateur brigitte = chauffeur("Essomba", "Brigitte", "+237691000002", "F", TypeVehicule.TAXI, proprietaire,
        "Toyota", "Yaris", "Jaune", "CE 456 CD", 4, 3.8680, 11.5200);
    Utilisateur samuel = chauffeur("Fotso", "Samuel", "+237691000003", "H", TypeVehicule.MOTO, null,
        "Nanfang", "NF125", "Rouge", "CE 789 MT", 1, 3.8600, 11.5100);

    // Historique pour le tableau de bord et les gains
    Random rnd = new Random(42);
    String[][] trajets = {
        {"Carrefour Bastos", "3.8960", "11.5090", "Poste Centrale", "3.8667", "11.5167"},
        {"Marché Mokolo", "3.8770", "11.5010", "Université de Yaoundé I", "3.8590", "11.4990"},
        {"Carrefour Essos", "3.8740", "11.5350", "Carrefour Warda", "3.8717", "11.5139"},
        {"Carrefour Mvan", "3.8247", "11.5194", "Marché Central", "3.8650", "11.5180"},
    };
    Utilisateur[] chauffeurs = {jean, brigitte, samuel};
    for (int i = 0; i < 40; i++) {
      String[] t = trajets[i % trajets.length];
      Utilisateur ch = chauffeurs[i % 3];
      Chauffeur profil = chauffeurRepository.findById(ch.getId()).orElseThrow();
      TypeService type = ch == samuel ? TypeService.MOTO : (i % 4 == 0 ? TypeService.RAMASSAGE : TypeService.DEPOT);
      LocalDateTime date = LocalDateTime.now().minusDays(rnd.nextInt(14)).minusHours(rnd.nextInt(10)).minusMinutes(rnd.nextInt(60));
      boolean annulee = i % 9 == 0;
      long prix = type == TypeService.RAMASSAGE ? 350 : (type == TypeService.MOTO ? 500 + rnd.nextInt(4) * 100 : 1500 + rnd.nextInt(10) * 100);
      long commission = type == TypeService.RAMASSAGE ? 25 : Math.round(prix * 0.15 / 25) * 25;
      Course c = courseRepository.save(Course.builder().reference("MR-" + Codes.alphanum(7)).client(i % 2 == 0 ? ernest : aicha)
          .chauffeur(annulee ? null : ch).vehicule(annulee ? null : profil.getVehicule()).typeService(type)
          .statut(annulee ? StatutCourse.ANNULEE : StatutCourse.TERMINEE).nbPlaces(1)
          .departAdresse(t[0]).departLat(Double.parseDouble(t[1])).departLng(Double.parseDouble(t[2]))
          .arriveeAdresse(t[3]).arriveeLat(Double.parseDouble(t[4])).arriveeLng(Double.parseDouble(t[5]))
          .distanceKm(2.5 + rnd.nextDouble() * 4).dureeMin(10.0 + rnd.nextInt(15))
          .prixReference(prix).prixMin(prix).prixMax(prix).prixPropose(prix).prixFinal(annulee ? null : prix)
          .commission(annulee ? null : commission).gainChauffeur(annulee ? null : prix - commission)
          .modePaiement(i % 3 == 0 ? ModePaiement.MTN_MOMO : ModePaiement.ESPECES)
          .statutPaiement(annulee ? StatutPaiementCourse.NON_PAYE : StatutPaiementCourse.PAYE)
          .codeVerification(Codes.chiffres(4)).tokenPartage(Codes.token()).createdAt(date)
          .accepteeAt(annulee ? null : date.plusMinutes(1)).debutAt(annulee ? null : date.plusMinutes(6))
          .finAt(annulee ? null : date.plusMinutes(25)).annuleeAt(annulee ? date.plusMinutes(2) : null)
          .annuleePar(annulee ? "CLIENT" : null).build());
      if (!annulee) {
        notationRepository.save(Notation.builder().course(c).auteur(c.getClient()).cible(ch).note(4 + rnd.nextInt(2)).build());
      }
    }
    for (Utilisateur ch : chauffeurs) {
      ch.setNoteMoyenne(4.6);
      ch.setNbNotes(12);
    }
    log.info("Données de démonstration créées : clients +237690000001/2, chauffeurs +237691000001/2/3, propriétaire +237691000010");
  }

  private Utilisateur client(String nom, String prenom, String tel, String genre) {
    return utilisateurRepository.save(Utilisateur.builder().nom(nom).prenom(prenom).telephone(tel).genre(genre)
        .role(Role.CLIENT).solde(5000L).codeParrainage(authService.nouveauCodeParrainage())
        .consentementAt(LocalDateTime.now()).build());
  }

  private Utilisateur chauffeur(String nom, String prenom, String tel, String genre, TypeVehicule type, Utilisateur proprietaire,
      String marque, String modele, String couleur, String immat, int places, double lat, double lng) {
    Utilisateur u = utilisateurRepository.save(Utilisateur.builder().nom(nom).prenom(prenom).telephone(tel).genre(genre)
        .role(Role.CHAUFFEUR).codeParrainage(authService.nouveauCodeParrainage()).consentementAt(LocalDateTime.now()).build());
    Vehicule v = vehiculeRepository.save(Vehicule.builder().proprietaire(proprietaire == null ? u : proprietaire)
        .typeVehicule(type).marque(marque).modele(modele).couleur(couleur).immatriculation(immat).nbPlaces(places).build());
    Chauffeur ch = chauffeurRepository.save(Chauffeur.builder().utilisateur(u).vehicule(v).typeService(type)
        .casqueDisponible(type == TypeVehicule.MOTO).latitude(lat).longitude(lng).positionAt(LocalDateTime.now().minusHours(1))
        .valideAt(LocalDateTime.now()).build());
    for (TypeDocument td : TypeDocument.values()) {
      LocalDate exp = switch (td) {
        case ASSURANCE -> LocalDate.now().plusDays(td.ordinal() == 3 && "Fotso".equals(nom) ? 10 : 200);
        case PERMIS -> LocalDate.now().plusYears(3);
        case CNI -> LocalDate.now().plusYears(5);
        default -> null;
      };
      documentRepository.save(DocumentChauffeur.builder().chauffeur(ch).type(td).fichier("prive/demo/document-demo.pdf")
          .nomOriginal(td.name().toLowerCase() + ".pdf").contentType("application/pdf").dateExpiration(exp)
          .statut(StatutDocument.VALIDE).verifieAt(LocalDateTime.now()).build());
    }
    return u;
  }
}
