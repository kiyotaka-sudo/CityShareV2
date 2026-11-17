package cm.cityshare.security;

import cm.cityshare.config.JwtConfig;
import cm.cityshare.entity.Utilisateur;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {
  private final JwtConfig jwtConfig;

  public String generateToken(Utilisateur user) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + jwtConfig.getExpiration());
    return Jwts.builder()
        .setSubject(user.getTelephone())
        .claim("userId", user.getId())
        .claim("role", user.getRole().name())
        .setIssuedAt(now)
        .setExpiration(expiry)
        .signWith(key(), SignatureAlgorithm.HS256)
        .compact();
  }

  public String getTelephone(String token) {
    return claims(token).getSubject();
  }

  public boolean validateToken(String token) {
    claims(token);
    return true;
  }

  private Claims claims(String token) {
    return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
  }

  private Key key() {
    return Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8));
  }
}
