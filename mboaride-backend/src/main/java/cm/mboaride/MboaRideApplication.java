package cm.mboaride;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Point d'entrée de l'API MboaRide. */
@SpringBootApplication
@EnableScheduling
@EnableAsync
@ConfigurationPropertiesScan
public class MboaRideApplication {
  public static void main(String[] args) {
    // Toutes les dates métier (heures de pointe, nuit, reçus) sont exprimées à l'heure du Cameroun
    TimeZone.setDefault(TimeZone.getTimeZone("Africa/Douala"));
    SpringApplication.run(MboaRideApplication.class, args);
  }
}
