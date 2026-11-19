package cm.mboaride.controller;

import cm.mboaride.dto.UserDtos.*;
import cm.mboaride.service.ProfilService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Profil de l'utilisateur connecté (BF-02, BF-05, BF-35) et droits sur ses données (BNF-07). */
@RestController
@RequestMapping("/api/moi")
@RequiredArgsConstructor
public class ProfilController {
  private final ProfilService profilService;

  @GetMapping
  public UtilisateurDto moi() {
    return profilService.moi();
  }

  @PutMapping
  public UtilisateurDto modifier(@Valid @RequestBody ProfilUpdate req) {
    return profilService.modifier(req);
  }

  @PostMapping(value = "/photo", consumes = "multipart/form-data")
  public UtilisateurDto photo(@RequestParam("fichier") MultipartFile fichier) {
    return profilService.changerPhoto(fichier);
  }

  @PutMapping("/push-token")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void pushToken(@Valid @RequestBody PushTokenUpdate req) {
    profilService.enregistrerPushToken(req.token());
  }

  @GetMapping("/contacts")
  public List<ContactDto> contacts() {
    return profilService.contacts();
  }

  @PostMapping("/contacts")
  @ResponseStatus(HttpStatus.CREATED)
  public ContactDto ajouterContact(@Valid @RequestBody ContactDto req) {
    return profilService.ajouterContact(req);
  }

  @DeleteMapping("/contacts/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void supprimerContact(@PathVariable Long id) {
    profilService.supprimerContact(id);
  }

  @GetMapping("/lieux")
  public List<LieuDto> lieux() {
    return profilService.lieux();
  }

  @PostMapping("/lieux")
  public LieuDto enregistrerLieu(@Valid @RequestBody LieuDto req) {
    return profilService.enregistrerLieu(req);
  }

  @DeleteMapping("/lieux/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void supprimerLieu(@PathVariable Long id) {
    profilService.supprimerLieu(id);
  }

  @GetMapping("/notifications")
  public List<NotificationDto> notifications() {
    return profilService.notifications();
  }

  @PostMapping("/notifications/lues")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void notificationsLues() {
    profilService.marquerNotificationsLues();
  }

  /** Droit d'accès : export de toutes les données personnelles. */
  @GetMapping("/export")
  public ExportDonnees exporter() {
    return profilService.exporter();
  }

  /** Droit à l'effacement (BF-05). */
  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void supprimer() {
    profilService.supprimerCompte();
  }
}
