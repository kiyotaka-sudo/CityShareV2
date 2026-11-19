package cm.mboaride.security;

import cm.mboaride.entity.Utilisateur;
import cm.mboaride.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Émission et vérification des jetons JWT (BNF-06). */
@Component
public class JwtTokenProvider {
  private final Key key;
  private final long expirationMs;

  public JwtTokenProvider(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration}") long expirationMs) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMs;
  }

  public String generer(Utilisateur user) {
    return generer(user, expirationMs);
  }

  public String generer(Utilisateur user, long dureeMs) {
    Date now = new Date();
    return Jwts.builder()
        .setSubject(String.valueOf(user.getId()))
        .claim("role", user.getRole().name())
        .claim("tel", user.getTelephone())
        .setIssuedAt(now)
        .setExpiration(new Date(now.getTime() + dureeMs))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  /** Jeton à usage limité (ex. lien de reçu PDF) portant un objet précis. */
  public String genererLien(String objet, long dureeMs) {
    Date now = new Date();
    return Jwts.builder().setSubject(objet).setIssuedAt(now)
        .setExpiration(new Date(now.getTime() + dureeMs))
        .signWith(key, SignatureAlgorithm.HS256).compact();
  }

  public boolean verifierLien(String token, String objetAttendu) {
    try {
      return objetAttendu.equals(claims(token).getSubject());
    } catch (JwtException | IllegalArgumentException ex) {
      return false;
    }
  }

  public Optional<AuthUser> lire(String token) {
    try {
      Claims c = claims(token);
      return Optional.of(new AuthUser(Long.valueOf(c.getSubject()), Role.valueOf(c.get("role", String.class)),
          c.get("tel", String.class)));
    } catch (JwtException | IllegalArgumentException ex) {
      return Optional.empty();
    }
  }

  private Claims claims(String token) {
    return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
  }
}
