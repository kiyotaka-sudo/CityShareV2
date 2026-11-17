package cm.cityshare.config;

import cm.cityshare.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
  private final JwtAuthenticationFilter jwtFilter;
  private final CorsConfigurationSource corsConfigurationSource;

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource))
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/ws/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/payments/monetbil/notify").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/trajets", "/api/trajets/").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/trajets/{id:\\d+}").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/trajets/mes-trajets").hasRole("CONDUCTEUR")
            .requestMatchers(HttpMethod.POST, "/api/trajets", "/api/trajets/").hasRole("CONDUCTEUR")
            .requestMatchers(HttpMethod.PUT, "/api/trajets/**").hasRole("CONDUCTEUR")
            .requestMatchers(HttpMethod.DELETE, "/api/trajets/**").hasRole("CONDUCTEUR")
            .requestMatchers(HttpMethod.POST, "/api/trajets/*/demarrer", "/api/trajets/*/terminer").hasRole("CONDUCTEUR")
            .requestMatchers(HttpMethod.GET, "/api/reservations/conducteur/**").hasRole("CONDUCTEUR")
            .requestMatchers(HttpMethod.POST, "/api/reservations/**").hasAnyRole("PASSAGER", "CONDUCTEUR")
            .requestMatchers(HttpMethod.POST, "/api/payments/reservation/**").hasRole("PASSAGER")
            .requestMatchers(HttpMethod.GET, "/api/payments/reservation/**").hasRole("PASSAGER")
            .requestMatchers(HttpMethod.POST, "/api/colis/**").hasAnyRole("EXPEDITEUR", "CONDUCTEUR")
            .anyRequest().authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
    return configuration.getAuthenticationManager();
  }
}
