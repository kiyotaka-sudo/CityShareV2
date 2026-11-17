package cm.cityshare.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "monetbil")
public class MonetbilProperties {
  private String serviceKey;
  private String serviceSecret;
  private String widgetVersion = "v2.1";
  private String apiBase = "https://api.monetbil.com/widget";
  private String notifyUrlBase;
  private String returnUrlBase = "cityshare://payment";
}
