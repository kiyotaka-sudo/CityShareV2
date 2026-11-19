package cm.mboaride.config;

import cm.mboaride.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/** Règles d'accès : API mobile (JWT), back-office (/api/admin), pages publiques. */
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
        .headers(h -> h.frameOptions(f -> f.sameOrigin()))
        .exceptionHandling(e -> e
            .authenticationEntryPoint((req, res, ex) -> erreur(res, 401, "auth.requise", "Authentification requise"))
            .accessDeniedHandler((req, res, ex) -> erreur(res, 403, "erreur.acces", "Accès refusé")))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers("/", "/index.html", "/favicon.ico", "/favicon.png", "/admin/**", "/suivi/**", "/suivi.html", "/confidentialite.html", "/assets/**",
                "/uploads/public/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/ws/**", "/error").permitAll()
            .requestMatchers("/api/auth/**", "/api/public/**", "/api/paiements/webhook/**").permitAll()
            .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPPORT")
            .requestMatchers("/api/chauffeur/**").hasAnyRole("CHAUFFEUR", "PROPRIETAIRE")
            .anyRequest().authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  private static void erreur(HttpServletResponse res, int status, String code, String message) throws java.io.IOException {
    res.setStatus(status);
    res.setContentType("application/json;charset=UTF-8");
    res.getWriter().write("{\"status\":" + status + ",\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
  }
}
