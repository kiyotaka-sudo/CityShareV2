package cm.mboaride.service;

import cm.mboaride.entity.Chauffeur;
import cm.mboaride.repository.ChauffeurRepository;
import cm.mboaride.util.Geo;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cache mémoire des positions des chauffeurs (mises à jour toutes les 5 s, BNF-01).
 * La base n'est écrite qu'une fois toutes les 30 s par chauffeur pour limiter la charge.
 */
@Service
@RequiredArgsConstructor
public class PositionService {
  /** Position GPS ; le cap (0-360°, nord = 0) sert à orienter le véhicule sur la carte. */
  public record Position(double lat, double lng, LocalDateTime at, double cap) {}

  private static final long PERSISTANCE_SECONDES = 30;

  private final ChauffeurRepository chauffeurRepository;
  private final Map<Long, Position> positions = new ConcurrentHashMap<>();

  @Transactional
  public void mettreAJour(Chauffeur chauffeur, double lat, double lng) {
    LocalDateTime now = LocalDateTime.now();
    Position precedente = positions.get(chauffeur.getId());
    double cap = precedente == null ? 0 : precedente.cap();
    // Le cap n'est recalculé qu'au-delà de 8 m : à l'arrêt, le bruit GPS ferait tourner le véhicule sur lui-même
    if (precedente != null && Geo.distanceKm(precedente.lat(), precedente.lng(), lat, lng) > 0.008) {
      cap = Geo.cap(precedente.lat(), precedente.lng(), lat, lng);
    }
    positions.put(chauffeur.getId(), new Position(lat, lng, now, cap));
    if (chauffeur.getPositionAt() == null || chauffeur.getPositionAt().isBefore(now.minusSeconds(PERSISTANCE_SECONDES))) {
      chauffeur.setLatitude(lat);
      chauffeur.setLongitude(lng);
      chauffeur.setPositionAt(now);
    }
  }

  /** Position la plus récente : cache mémoire, sinon dernière position enregistrée. */
  public Optional<Position> position(Chauffeur chauffeur) {
    Position p = positions.get(chauffeur.getId());
    if (p != null) {
      return Optional.of(p);
    }
    if (chauffeur.getLatitude() != null && chauffeur.getPositionAt() != null) {
      return Optional.of(new Position(chauffeur.getLatitude(), chauffeur.getLongitude(), chauffeur.getPositionAt(), 0));
    }
    return Optional.empty();
  }

  public Optional<Position> position(Long chauffeurId) {
    return Optional.ofNullable(positions.get(chauffeurId));
  }

  /** Position considérée comme fraîche (chauffeur réellement connecté). */
  public Optional<Position> positionRecente(Chauffeur chauffeur, int secondes) {
    return position(chauffeur).filter(p -> p.at().isAfter(LocalDateTime.now().minusSeconds(secondes)));
  }

  public void oublier(Long chauffeurId) {
    positions.remove(chauffeurId);
  }
}
