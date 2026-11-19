package cm.mboaride.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Erreur métier. Le {@code code} est une clé des fichiers i18n/messages_*.properties :
 * le message est traduit dans la langue de l'utilisateur (BF-67, BNF-08).
 */
@Getter
public class ApiException extends RuntimeException {
  private final HttpStatus status;
  private final String code;
  private final transient Object[] args;

  public ApiException(HttpStatus status, String code, Object... args) {
    super(code);
    this.status = status;
    this.code = code;
    this.args = args;
  }

  public static ApiException badRequest(String code, Object... args) {
    return new ApiException(HttpStatus.BAD_REQUEST, code, args);
  }

  public static ApiException notFound(String code, Object... args) {
    return new ApiException(HttpStatus.NOT_FOUND, code, args);
  }

  public static ApiException forbidden(String code, Object... args) {
    return new ApiException(HttpStatus.FORBIDDEN, code, args);
  }

  public static ApiException conflict(String code, Object... args) {
    return new ApiException(HttpStatus.CONFLICT, code, args);
  }

  public static ApiException unauthorized(String code, Object... args) {
    return new ApiException(HttpStatus.UNAUTHORIZED, code, args);
  }

  public static ApiException tooMany(String code, Object... args) {
    return new ApiException(HttpStatus.TOO_MANY_REQUESTS, code, args);
  }
}
