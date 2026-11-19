package cm.mboaride.service;

import cm.mboaride.config.AppProperties;
import cm.mboaride.entity.Course;
import cm.mboaride.enums.StatutCourse;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.CourseRepository;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.security.JwtTokenProvider;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Génération des reçus de course (BF-15, BF-26) et des rapports PDF (BF-64). */
@Service
@RequiredArgsConstructor
public class DocumentPdfService {
  static final Color VERT = new Color(0x03, 0x2E, 0x5D); // bleu marine du logo
  static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

  private final CourseRepository courseRepository;
  private final JwtTokenProvider tokenProvider;
  private final AppProperties props;
  private final CurrentUser currentUser;

  /** Lien de téléchargement signé, valable 10 minutes (ouvrable dans le navigateur du téléphone). */
  @Transactional(readOnly = true)
  public Map<String, String> lienRecu(Long courseId) {
    Long moi = currentUser.id();
    Course c = courseRepository.findById(courseId)
        .filter(x -> x.getClient().getId().equals(moi) || (x.getChauffeur() != null && x.getChauffeur().getId().equals(moi)))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
    if (c.getStatut() != StatutCourse.TERMINEE) {
      throw ApiException.badRequest("recu.course_non_terminee");
    }
    String token = tokenProvider.genererLien("recu:" + courseId, 10 * 60 * 1000L);
    return Map.of("url", props.publicUrl() + "/api/public/recus/" + courseId + ".pdf?t=" + token);
  }

  @Transactional(readOnly = true)
  public byte[] recu(Long courseId, String token) {
    if (!tokenProvider.verifierLien(token, "recu:" + courseId)) {
      throw ApiException.forbidden("recu.lien_invalide");
    }
    Course c = courseRepository.findById(courseId).orElseThrow(() -> ApiException.notFound("course.introuvable"));
    return recuPdf(c);
  }

  byte[] recuPdf(Course c) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Document doc = new Document(PageSize.A5, 36, 36, 36, 36);
    PdfWriter.getInstance(doc, out);
    doc.open();
    Font titre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, VERT);
    Font gras = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
    Font normal = FontFactory.getFont(FontFactory.HELVETICA, 10);
    Font petit = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
    if (!ajouterLogo(doc, 120)) {
      doc.add(new Paragraph("MboaRide", titre));
    }
    doc.add(new Paragraph("Reçu de course n° " + c.getReference(), gras));
    doc.add(new Paragraph(c.getFinAt() == null ? "" : "Le " + FORMAT.format(c.getFinAt()), normal));
    doc.add(Chunk.NEWLINE);

    PdfPTable t = new PdfPTable(new float[] {2, 3});
    t.setWidthPercentage(100);
    ligne(t, "Service", libelleService(c), gras, normal);
    ligne(t, "Départ", c.getDepartAdresse() + (c.getDepartRepere() == null ? "" : " (" + c.getDepartRepere() + ")"), gras, normal);
    ligne(t, "Arrivée", c.getArriveeAdresse(), gras, normal);
    ligne(t, "Distance", String.format("%.1f km", c.getDistanceKm()), gras, normal);
    if (c.getDebutAt() != null && c.getFinAt() != null) {
      ligne(t, "Durée", java.time.Duration.between(c.getDebutAt(), c.getFinAt()).toMinutes() + " min", gras, normal);
    }
    ligne(t, "Chauffeur", c.getChauffeur() == null ? "-" : c.getChauffeur().getPrenom() + " " + c.getChauffeur().getNom().charAt(0) + ".", gras, normal);
    if (c.getVehicule() != null) {
      ligne(t, "Véhicule", c.getVehicule().getLibelle() + " — " + c.getVehicule().getImmatriculation(), gras, normal);
    }
    ligne(t, "Passagers / places", String.valueOf(c.getNbPlaces()), gras, normal);
    ligne(t, "Prix de référence", fcfa(c.getPrixReference()), gras, normal);
    ligne(t, "Prix convenu", fcfa(c.getPrixFinal()), gras, normal);
    if (c.getReduction() > 0) {
      ligne(t, "Réduction", "- " + fcfa(c.getReduction()), gras, normal);
    }
    ligne(t, "Total payé", fcfa(c.getMontantAPayer()), gras, gras);
    ligne(t, "Mode de paiement", libellePaiement(c), gras, normal);
    doc.add(t);
    doc.add(Chunk.NEWLINE);
    doc.add(new Paragraph("Le prix convenu est définitif (négociation encadrée MboaRide). Montants en FCFA, TVA non applicable.", petit));
    doc.add(new Paragraph("Une réclamation ? Signalez-la depuis l'historique de vos courses dans l'application.", petit));
    doc.close();
    return out.toByteArray();
  }

  /** Rapport tabulaire générique (export du back-office). */
  public byte[] rapport(String titreRapport, List<String> entetes, List<List<Object>> lignes) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Document doc = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
    PdfWriter.getInstance(doc, out);
    doc.open();
    ajouterLogo(doc, 110);
    doc.add(new Paragraph("MboaRide — " + titreRapport, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, VERT)));
    doc.add(new Paragraph("Généré le " + FORMAT.format(java.time.LocalDateTime.now()), FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY)));
    doc.add(Chunk.NEWLINE);
    PdfPTable t = new PdfPTable(entetes.size());
    t.setWidthPercentage(100);
    t.setHeaderRows(1);
    Font f = FontFactory.getFont(FontFactory.HELVETICA, 8);
    Font fh = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
    for (String e : entetes) {
      PdfPCell cell = new PdfPCell(new Phrase(e, fh));
      cell.setBackgroundColor(VERT);
      cell.setPadding(4);
      t.addCell(cell);
    }
    for (List<Object> ligne : lignes) {
      for (Object v : ligne) {
        PdfPCell cell = new PdfPCell(new Phrase(v == null ? "" : String.valueOf(v), f));
        cell.setPadding(3);
        t.addCell(cell);
      }
    }
    doc.add(t);
    doc.close();
    return out.toByteArray();
  }

  /** Logo officiel (static/assets/logo.png) en tête de document ; renvoie faux s'il est introuvable. */
  private static boolean ajouterLogo(Document doc, float largeur) {
    try (var in = DocumentPdfService.class.getResourceAsStream("/static/assets/logo.png")) {
      if (in == null) {
        return false;
      }
      com.lowagie.text.Image logo = com.lowagie.text.Image.getInstance(in.readAllBytes());
      logo.scaleToFit(largeur, largeur);
      doc.add(logo);
      return true;
    } catch (Exception ex) {
      return false;
    }
  }

  private static void ligne(PdfPTable t, String libelle, String valeur, Font fl, Font fv) {
    PdfPCell a = new PdfPCell(new Phrase(libelle, fl));
    PdfPCell b = new PdfPCell(new Phrase(valeur == null ? "-" : valeur, fv));
    a.setBorder(Rectangle.BOTTOM);
    b.setBorder(Rectangle.BOTTOM);
    a.setBorderColor(new Color(0xE5, 0xE7, 0xEB));
    b.setBorderColor(new Color(0xE5, 0xE7, 0xEB));
    a.setPadding(5);
    b.setPadding(5);
    t.addCell(a);
    t.addCell(b);
  }

  static String fcfa(Long montant) {
    return montant == null ? "-" : String.format("%,d FCFA", montant).replace(',', ' ');
  }

  static String libelleService(Course c) {
    return switch (c.getTypeService()) {
      case DEPOT -> "Taxi — dépôt (course privée)";
      case RAMASSAGE -> "Taxi — ramassage (" + c.getNbPlaces() + " place(s))";
      case MOTO -> "Moto-taxi";
    };
  }

  static String libellePaiement(Course c) {
    return switch (c.getModePaiement()) {
      case ESPECES -> "Espèces";
      case MTN_MOMO -> "MTN Mobile Money";
      case ORANGE_MONEY -> "Orange Money";
      case PORTEFEUILLE -> "Portefeuille MboaRide";
    };
  }
}
