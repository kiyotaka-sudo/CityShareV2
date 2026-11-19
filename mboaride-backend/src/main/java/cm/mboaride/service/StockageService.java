package cm.mboaride.service;

import cm.mboaride.config.AppProperties;
import cm.mboaride.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stockage des fichiers sur disque. Deux espaces :
 * public/ (photos de profil et de véhicule, servies sur /uploads/public) et prive/ (pièces d'identité, accès admin).
 */
@Service
@RequiredArgsConstructor
public class StockageService {
  private static final Set<String> TYPES_IMAGE = Set.of("image/jpeg", "image/png", "image/webp", "image/heic");
  private static final Set<String> TYPES_DOCUMENT = Set.of("image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf");

  private final AppProperties props;

  /** Enregistre une photo publique et renvoie son chemin relatif d'URL (/uploads/public/...). */
  public String enregistrerPhoto(MultipartFile fichier, String dossier) {
    String nom = enregistrer(fichier, "public/" + dossier, TYPES_IMAGE);
    return "/uploads/public/" + dossier + "/" + nom;
  }

  /** Enregistre une pièce justificative privée et renvoie son chemin relatif de stockage. */
  public String enregistrerDocument(MultipartFile fichier, Long chauffeurId) {
    String dossier = "prive/chauffeurs/" + chauffeurId;
    return dossier + "/" + enregistrer(fichier, dossier, TYPES_DOCUMENT);
  }

  public Resource lire(String cheminRelatif) {
    Path racine = racine();
    Path chemin = racine.resolve(cheminRelatif).normalize();
    if (!chemin.startsWith(racine) || !Files.exists(chemin)) {
      throw ApiException.notFound("fichier.introuvable");
    }
    return new PathResource(chemin);
  }

  public void supprimer(String cheminRelatif) {
    if (cheminRelatif == null) {
      return;
    }
    String relatif = cheminRelatif.startsWith("/uploads/") ? cheminRelatif.substring("/uploads/".length()) : cheminRelatif;
    try {
      Path chemin = racine().resolve(relatif).normalize();
      if (chemin.startsWith(racine())) {
        Files.deleteIfExists(chemin);
      }
    } catch (IOException ignored) {
      // fichier déjà absent
    }
  }

  private String enregistrer(MultipartFile fichier, String dossier, Set<String> typesAutorises) {
    if (fichier == null || fichier.isEmpty()) {
      throw ApiException.badRequest("fichier.vide");
    }
    String type = fichier.getContentType() == null ? "" : fichier.getContentType().toLowerCase();
    if (!typesAutorises.contains(type)) {
      throw ApiException.badRequest("fichier.type");
    }
    String extension = switch (type) {
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/heic" -> ".heic";
      case "application/pdf" -> ".pdf";
      default -> ".jpg";
    };
    String nom = UUID.randomUUID() + extension;
    try (InputStream in = fichier.getInputStream()) {
      Path cible = racine().resolve(dossier);
      Files.createDirectories(cible);
      Files.copy(in, cible.resolve(nom), StandardCopyOption.REPLACE_EXISTING);
      return nom;
    } catch (IOException ex) {
      throw new IllegalStateException("Impossible d'enregistrer le fichier", ex);
    }
  }

  private Path racine() {
    return Path.of(props.uploadDir()).toAbsolutePath().normalize();
  }
}
