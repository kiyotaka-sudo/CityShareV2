package cm.mboaride.service.carto;

import cm.mboaride.util.Geo;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Distance et durée routières via OSRM (OpenStreetMap). En cas d'indisponibilité ou de lenteur
 * (réseau faible, BNF-01), on bascule sur une estimation à vol d'oiseau majorée.
 */
@Slf4j
@Service
public class RoutageService {
  /** Facteur entre distance à vol d'oiseau et distance routière observé en ville. */
  static final double FACTEUR_SINUOSITE = 1.35;
  /** Vitesse moyenne urbaine (km/h) utilisée pour l'estimation de secours. */
  static final double VITESSE_MOYENNE_KMH = 22;

  public record Itineraire(double distanceKm, double dureeMin, boolean estime, List<double[]> trace) {}

  private final RestClient client;
  private final String osrmUrl;
  private final Map<String, Itineraire> cache = Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, Itineraire> eldest) {
      return size() > 500;
    }
  });

  public RoutageService(@Value("${maps.osrm-url}") String osrmUrl, @Value("${maps.osrm-timeout-ms}") int timeoutMs) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(timeoutMs);
    factory.setReadTimeout(timeoutMs);
    this.client = RestClient.builder().requestFactory(factory).defaultHeader("User-Agent", "MboaRide/1.0").build();
    this.osrmUrl = osrmUrl;
  }

  /** Distance et durée seulement (calcul du prix). */
  public Itineraire calculer(double lat1, double lng1, double lat2, double lng2) {
    return appeler(lat1, lng1, lat2, lng2, false);
  }

  /** Itinéraire complet avec tracé, pour la navigation du chauffeur (BF-36). */
  public Itineraire trace(double lat1, double lng1, double lat2, double lng2) {
    return appeler(lat1, lng1, lat2, lng2, true);
  }

  private Itineraire appeler(double lat1, double lng1, double lat2, double lng2, boolean avecTrace) {
    String cle = String.format("%.4f,%.4f;%.4f,%.4f;%s", lat1, lng1, lat2, lng2, avecTrace);
    Itineraire enCache = cache.get(cle);
    if (enCache != null) {
      return enCache;
    }
    try {
      String url = String.format(java.util.Locale.ROOT, "%s/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=%s&geometries=geojson",
          osrmUrl, lng1, lat1, lng2, lat2, avecTrace ? "full" : "false");
      JsonNode res = client.get().uri(url).retrieve().body(JsonNode.class);
      JsonNode route = res == null ? null : res.path("routes").path(0);
      if (route != null && route.has("distance")) {
        List<double[]> trace = new ArrayList<>();
        if (avecTrace) {
          route.path("geometry").path("coordinates").forEach(p -> trace.add(new double[] {p.get(1).asDouble(), p.get(0).asDouble()}));
        }
        Itineraire it = new Itineraire(route.get("distance").asDouble() / 1000.0, route.get("duration").asDouble() / 60.0, false, trace);
        cache.put(cle, it);
        return it;
      }
    } catch (Exception ex) {
      log.debug("OSRM indisponible, estimation locale : {}", ex.getMessage());
    }
    return estimer(lat1, lng1, lat2, lng2);
  }

  public static Itineraire estimer(double lat1, double lng1, double lat2, double lng2) {
    double km = Geo.distanceKm(lat1, lng1, lat2, lng2) * FACTEUR_SINUOSITE;
    double minutes = km / VITESSE_MOYENNE_KMH * 60.0;
    List<double[]> trace = List.of(new double[] {lat1, lng1}, new double[] {lat2, lng2});
    return new Itineraire(km, Math.max(1, minutes), true, trace);
  }
}
