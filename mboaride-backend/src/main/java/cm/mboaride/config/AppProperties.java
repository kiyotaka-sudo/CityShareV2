package cm.mboaride.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Propriétés générales de l'application (préfixe mboaride). */
@ConfigurationProperties(prefix = "mboaride")
public record AppProperties(String publicUrl, String uploadDir, String zoneId, Boolean demoData) {
  public AppProperties {
    if (publicUrl == null) publicUrl = "http://localhost:8080";
    if (uploadDir == null) uploadDir = "./uploads";
    if (zoneId == null) zoneId = "Africa/Douala";
    if (demoData == null) demoData = true;
  }
}
