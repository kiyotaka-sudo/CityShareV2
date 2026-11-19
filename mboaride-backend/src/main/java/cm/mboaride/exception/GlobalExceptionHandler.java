package cm.mboaride.exception;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Format d'erreur uniforme : { status, code, message, errors, timestamp }. */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
  private final MessageSource messageSource;

  public record ErrorBody(int status, String code, String message, List<String> errors, String timestamp) {}

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorBody> api(ApiException ex) {
    return body(ex.getStatus(), ex.getCode(), translate(ex.getCode(), ex.getArgs()), null);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException ex) {
    List<String> errors = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + " : " + e.getDefaultMessage())
        .toList();
    return body(HttpStatus.BAD_REQUEST, "erreur.validation", translate("erreur.validation"), errors);
  }

  @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
      MissingServletRequestParameterException.class, IllegalArgumentException.class})
  public ResponseEntity<ErrorBody> badRequest(Exception ex) {
    return body(HttpStatus.BAD_REQUEST, "erreur.requete", translate("erreur.requete"), List.of(ex.getMessage()));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorBody> denied(AccessDeniedException ex) {
    return body(HttpStatus.FORBIDDEN, "erreur.acces", translate("erreur.acces"), null);
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ErrorBody> upload(MaxUploadSizeExceededException ex) {
    return body(HttpStatus.PAYLOAD_TOO_LARGE, "erreur.fichier.taille", translate("erreur.fichier.taille"), null);
  }

  @ExceptionHandler({NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class})
  public ResponseEntity<ErrorBody> notFound(Exception ex) {
    return body(HttpStatus.NOT_FOUND, "erreur.introuvable", translate("erreur.introuvable"), null);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorBody> generic(Exception ex) {
    log.error("Erreur inattendue", ex);
    return body(HttpStatus.INTERNAL_SERVER_ERROR, "erreur.interne", translate("erreur.interne"), null);
  }

  private String translate(String code, Object... args) {
    Locale locale = LocaleContextHolder.getLocale();
    return messageSource.getMessage(code, args, code, locale);
  }

  private ResponseEntity<ErrorBody> body(HttpStatus status, String code, String message, List<String> errors) {
    return ResponseEntity.status(status)
        .body(new ErrorBody(status.value(), code, message, errors, LocalDateTime.now().toString()));
  }
}
