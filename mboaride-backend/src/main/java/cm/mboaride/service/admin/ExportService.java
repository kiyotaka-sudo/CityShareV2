package cm.mboaride.service.admin;

import cm.mboaride.dto.AdminDtos.*;
import cm.mboaride.enums.StatutCourse;
import cm.mboaride.enums.TypeService;
import cm.mboaride.service.DocumentPdfService;
import cm.mboaride.service.ExcelService;
import cm.mboaride.service.JournalService;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Export des rapports au format Excel ou PDF (BF-64). */
@Service
@RequiredArgsConstructor
public class ExportService {
  private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

  public record Fichier(String nom, String contentType, byte[] contenu) {}

  private final AdminGestionService gestion;
  private final AdminChauffeurService chauffeurs;
  private final ExcelService excel;
  private final DocumentPdfService pdf;
  private final JournalService journal;

  @Transactional(readOnly = true)
  public Fichier exporter(String rapport, String format, StatutCourse statut, TypeService type, LocalDate du, LocalDate au) {
    List<String> entetes;
    List<List<Object>> lignes = new ArrayList<>();
    String titre;
    switch (rapport) {
      case "courses" -> {
        titre = "Courses";
        entetes = List.of("Référence", "Date", "Service", "Statut", "Client", "Chauffeur", "Immatriculation", "Départ",
            "Arrivée", "Km", "Prix réf.", "Prix final", "Payé", "Commission", "Paiement", "État paiement");
        for (var c : gestion.coursesFiltrees(statut, type, du, au, null, 10000)) {
          CourseAdminDto d = AdminGestionService.courseDto(c);
          lignes.add(List.of(d.reference(), F.format(d.createdAt()), d.typeService().name(), d.statut().name(), d.client(),
              nv(d.chauffeur()), nv(d.immatriculation()), d.depart(), d.arrivee(), d.distanceKm(), d.prixReference(),
              nv(d.prixFinal()), d.montantAPayer(), nv(d.commission()), d.modePaiement().name(), d.statutPaiement().name()));
        }
      }
      case "chauffeurs" -> {
        titre = "Chauffeurs";
        entetes = List.of("Nom", "Prénom", "Téléphone", "Service", "Statut", "Véhicule", "Immatriculation", "Note", "Avis",
            "Solde", "Documents à jour", "Inscription");
        for (var c : chauffeurs.liste()) {
          lignes.add(List.of(c.nom(), c.prenom(), c.telephone(), c.typeService().name(), c.statut().name(),
              c.vehicule() == null ? "" : c.vehicule().marque() + " " + nv(c.vehicule().modele()),
              c.vehicule() == null ? "" : c.vehicule().immatriculation(), Math.round(c.noteMoyenne() * 10) / 10.0, c.nbNotes(),
              c.solde(), c.documentsAJour() ? "Oui" : "Non", F.format(c.dateInscription())));
        }
      }
      case "paiements" -> {
        titre = "Paiements";
        entetes = List.of("Référence", "Date", "Type", "Montant", "Mode", "Fournisseur", "Statut", "Message");
        for (var p : gestion.paiements()) {
          lignes.add(List.of(p.reference(), F.format(p.createdAt()), p.type().name(), p.montant(), p.mode().name(),
              p.fournisseur().name(), p.statut().name(), nv(p.message())));
        }
      }
      case "retraits" -> {
        titre = "Retraits chauffeurs";
        entetes = List.of("Référence", "Date", "Chauffeur", "Montant", "Téléphone", "Opérateur", "Statut", "Traité le");
        for (var r : gestion.retraits()) {
          lignes.add(List.of(r.reference(), F.format(r.createdAt()), r.chauffeurNom(), r.montant(), r.telephone(),
              r.operateur().name(), r.statut().name(), r.traiteAt() == null ? "" : F.format(r.traiteAt())));
        }
      }
      default -> throw new IllegalArgumentException("Rapport inconnu : " + rapport);
    }
    journal.tracer("EXPORT_" + rapport.toUpperCase(), null, null, format + " — " + lignes.size() + " lignes");
    String base = "mboaride-" + rapport + "-" + LocalDate.now();
    if ("pdf".equalsIgnoreCase(format)) {
      return new Fichier(base + ".pdf", "application/pdf", pdf.rapport(titre, entetes, lignes));
    }
    return new Fichier(base + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        excel.classeur(titre, entetes, lignes));
  }

  private static Object nv(Object v) {
    return v == null ? "" : v;
  }
}
