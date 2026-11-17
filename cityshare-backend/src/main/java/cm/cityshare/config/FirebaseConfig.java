package cm.cityshare.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.InputStream;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {
  public FirebaseConfig() {
    try {
      if (FirebaseApp.getApps().isEmpty()) {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
        if (stream != null) {
          FirebaseOptions options = FirebaseOptions.builder()
              .setCredentials(GoogleCredentials.fromStream(stream))
              .build();
          FirebaseApp.initializeApp(options);
        }
      }
    } catch (Exception ignored) {
    }
  }
}
