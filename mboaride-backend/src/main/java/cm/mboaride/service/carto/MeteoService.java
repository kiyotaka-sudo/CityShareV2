package cm.mboaride.service.carto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Détection de la pluie (Open-Meteo, gratuit et sans clé) pour la majoration météo. Cache de 15 minutes. */
@Slf4j
@Service
public class MeteoService {
  private record Releve(boolean pluie, Instant at) {}

  private final RestClient client;
  private final String url;
  private final Map<String, Releve> cache = new ConcurrentHashMap<>();

  public MeteoService(@Value("${maps.meteo-url}") String url) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(1500);
    factory.setReadTimeout(1500);
    this.client = RestClient.builder().requestFactory(factory).build();
    this.url = url;
  }

  public boolean ilPleut(double lat, double lng) {
    // Cellule d'environ 10 km : une seule requête par quartier
    String cellule = String.format(java.util.Locale.ROOT, "%.1f,%.1f", lat, lng);
    Releve r = cache.get(cellule);
    if (r != null && r.at().isAfter(Instant.now().minusSeconds(900))) {
      return r.pluie();
    }
    boolean pluie = false;
    try {
      JsonNode res = client.get()
          .uri(String.format(java.util.Locale.ROOT, "%s?latitude=%.3f&longitude=%.3f&current=precipitation,rain", url, lat, lng))
          .retrieve().body(JsonNode.class);
      JsonNode current = res == null ? null : res.path("current");
      pluie = current != null && (current.path("precipitation").asDouble(0) >= 0.3 || current.path("rain").asDouble(0) >= 0.3);
    } catch (Exception ex) {
      log.debug("Météo indisponible : {}", ex.getMessage());
    }
    cache.put(cellule, new Releve(pluie, Instant.now()));
    return pluie;
  }
}
