package cm.cityshare.controller;

import cm.cityshare.dto.request.TrajetRequest;
import cm.cityshare.dto.response.TrajetResponse;
import cm.cityshare.service.TrajetService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trajets")
@RequiredArgsConstructor
public class TrajetController {
  private final TrajetService trajetService;

  @PostMapping({"", "/"})
  public ResponseEntity<TrajetResponse> create(@Valid @RequestBody TrajetRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(trajetService.createTrajet(request));
  }

  @GetMapping({"", "/"})
  public List<TrajetResponse> list(@RequestParam(required = false) String depart,
                                   @RequestParam(required = false) String arrivee,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                   @RequestParam(required = false) Integer places) {
    return trajetService.searchTrajets(depart, arrivee, date, places);
  }

  @GetMapping("/mes-trajets")
  public List<TrajetResponse> mesTrajets() {
    return trajetService.listByConducteur();
  }

  @GetMapping("/{id}")
  public TrajetResponse get(@PathVariable Long id) {
    return trajetService.getTrajet(id);
  }

  @PutMapping("/{id}")
  public TrajetResponse update(@PathVariable Long id, @Valid @RequestBody TrajetRequest request) {
    return trajetService.updateTrajet(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    trajetService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/demarrer")
  public TrajetResponse demarrer(@PathVariable Long id) {
    return trajetService.demarrerTrajet(id);
  }

  @PostMapping("/{id}/terminer")
  public TrajetResponse terminer(@PathVariable Long id) {
    return trajetService.terminerTrajet(id);
  }
}
