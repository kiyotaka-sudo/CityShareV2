package cm.cityshare.controller;

import cm.cityshare.dto.request.ColisRequest;
import cm.cityshare.dto.response.ColisResponse;
import cm.cityshare.enums.StatutColis;
import cm.cityshare.service.ColisService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/colis")
@RequiredArgsConstructor
public class ColisController {
  private final ColisService colisService;

  @PostMapping({"", "/"})
  public ResponseEntity<ColisResponse> create(@Valid @RequestBody ColisRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(colisService.create(request));
  }

  @GetMapping("/match")
  public List<?> match(
      @RequestParam(required = false) String depart,
      @RequestParam(required = false) String arrivee,
      @RequestParam(required = false) String poids
  ) {
    return colisService.match(depart, arrivee, poids);
  }

  @GetMapping("/mes-colis")
  public List<ColisResponse> mine() {
    return colisService.mine();
  }

  @PostMapping("/{id}/accepter")
  public ColisResponse accepter(@PathVariable Long id) {
    return colisService.accepter(id);
  }

  @PutMapping("/{id}/statut")
  public ColisResponse statut(@PathVariable Long id, @RequestBody Map<String, String> body) {
    return colisService.updateStatut(id, StatutColis.valueOf(body.getOrDefault("statut", "EN_TRANSIT")));
  }
}
