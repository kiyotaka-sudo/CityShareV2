package cm.mboaride.config;

import java.nio.file.Path;
import java.util.Locale;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/** Ressources statiques (back-office, photos), langues et client HTTP sortant. */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
  private final AppProperties props;

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // Seules les photos (profil, véhicule) sont publiques ; les pièces d'identité passent par l'API admin
    String publicDir = Path.of(props.uploadDir(), "public").toAbsolutePath().toUri().toString();
    registry.addResourceHandler("/uploads/public/**").addResourceLocations(publicDir);
  }

  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    registry.addRedirectViewController("/", "/admin/");
    registry.addViewController("/admin/").setViewName("forward:/admin/index.html");
    registry.addViewController("/suivi/{token}").setViewName("forward:/suivi.html");
  }

  @Bean
  public LocaleResolver localeResolver() {
    AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
    resolver.setSupportedLocales(List.of(Locale.FRENCH, Locale.ENGLISH));
    resolver.setDefaultLocale(Locale.FRENCH);
    return resolver;
  }

  @Bean
  public MessageSource messageSource() {
    ReloadableResourceBundleMessageSource source = new ReloadableResourceBundleMessageSource();
    source.setBasename("classpath:i18n/messages");
    source.setDefaultEncoding("UTF-8");
    source.setFallbackToSystemLocale(false);
    source.setDefaultLocale(Locale.FRENCH);
    return source;
  }

  /** Client HTTP pour les services externes (OSRM, météo, Twilio, Monetbil, CamPay, Expo). */
  @Bean
  public RestClient restClient() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(5000);
    factory.setReadTimeout(15000);
    return RestClient.builder().requestFactory(factory).defaultHeader("User-Agent", "MboaRide/1.0").build();
  }
}
