package cm.mboaride.service;

import cm.mboaride.entity.Zone;
import cm.mboaride.enums.TypeService;
import cm.mboaride.repository.ZoneRepository;
import cm.mboaride.util.Geo;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Zones de service : majoration locale et restrictions du service moto (BF-31). */
@Service
@RequiredArgsConstructor
public class ZoneService {
  private final ZoneRepository zoneRepository;

  public List<Zone> zonesContenant(double lat, double lng) {
    return zoneRepository.findByActiveTrue().stream()
        .filter(z -> Geo.distanceKm(lat, lng, z.getCentreLat(), z.getCentreLng()) <= z.getRayonKm())
        .toList();
  }

  /** Zone la plus précise (plus petit rayon) contenant le point. */
  public Optional<Zone> zonePrincipale(double lat, double lng) {
    return zonesContenant(lat, lng).stream().min(Comparator.comparingDouble(Zone::getRayonKm));
  }

  public boolean estDesservi(double lat, double lng) {
    return !zonesContenant(lat, lng).isEmpty();
  }

  /** Raison pour laquelle un service n'est pas proposé à ce point et cette heure (clé i18n), sinon vide. */
  public Optional<String> motifIndisponibilite(TypeService type, double lat, double lng, LocalTime heure) {
    List<Zone> zones = zonesContenant(lat, lng);
    if (zones.isEmpty()) {
      return Optional.of("zone.hors_service");
    }
    if (type == TypeService.MOTO) {
      for (Zone z : zones) {
        if (!z.getMotoActive()) {
          return Optional.of("moto.zone_interdite");
        }
        if (z.getMotoInterditDebut() != null && z.getMotoInterditFin() != null
            && ParametreService.dansPlage(heure, z.getMotoInterditDebut(), z.getMotoInterditFin())) {
          return Optional.of("moto.horaire_interdit");
        }
      }
    }
    return Optional.empty();
  }
}
