package cm.mboaride.service.carto;

import cm.mboaride.entity.Chauffeur;
import cm.mboaride.enums.TypeVehicule;
import cm.mboaride.repository.ChauffeurRepository;
import cm.mboaride.service.PositionService;
import cm.mboaride.util.Geo;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Véhicules disponibles autour du client, affichés et animés sur la carte d'accueil.
 * Confidentialité des chauffeurs : identifiant opaque renouvelé chaque jour, position décalée d'environ 60 m
 * (décalage fixe par chauffeur pour que l'animation reste fluide) et arrondie à environ 10 m.
 */
@Service
@RequiredArgsConstructor
public class VehiculesProchesService {
  static final double RAYON_KM = 3;
  static final int MAX_VEHICULES = 25;
  /** Décalage maximal appliqué à la position, en degrés (environ 60 m). */
  static final double DECALAGE_DEG = 0.00055;

  /** type : TAXI, RAMASSAGE (taxi en mode ramassage) ou MOTO. */
  public record VehiculeProche(String id, String type, double lat, double lng, double cap) {}

  private final ChauffeurRepository chauffeurRepository;
  private final PositionService positions;

  @Transactional(readOnly = true)
  public List<VehiculeProche> autour(double lat, double lng) {
    String sel = LocalDate.now().toString();
    return chauffeurRepository.findDisponibles().stream()
        .map(ch -> positions.positionRecente(ch, 180).map(p -> new Object[] {ch, p}).orElse(null))
        .filter(o -> o != null)
        .map(o -> {
          Chauffeur ch = (Chauffeur) o[0];
          PositionService.Position p = (PositionService.Position) o[1];
          byte[] h = hash(sel + ":" + ch.getId());
          double dLat = ((h[0] & 0xff) / 255.0 - 0.5) * 2 * DECALAGE_DEG;
          double dLng = ((h[1] & 0xff) / 255.0 - 0.5) * 2 * DECALAGE_DEG;
          String type = ch.getTypeService() == TypeVehicule.MOTO ? "MOTO" : (ch.getModeRamassage() ? "RAMASSAGE" : "TAXI");
          return new VehiculeProche(HexFormat.of().formatHex(h, 2, 10), type,
              arrondir(p.lat() + dLat), arrondir(p.lng() + dLng), Math.round(p.cap()));
        })
        .filter(v -> Geo.distanceKm(lat, lng, v.lat(), v.lng()) <= RAYON_KM)
        .sorted(Comparator.comparingDouble(v -> Geo.distanceKm(lat, lng, v.lat(), v.lng())))
        .limit(MAX_VEHICULES)
        .toList();
  }

  static double arrondir(double v) {
    return Math.round(v * 10000) / 10000.0;
  }

  private static byte[] hash(String s) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }
}
