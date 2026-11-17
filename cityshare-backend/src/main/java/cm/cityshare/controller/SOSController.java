package cm.cityshare.controller;

import cm.cityshare.dto.request.SOSRequest;
import cm.cityshare.entity.AlerteSOS;
import cm.cityshare.service.SOSService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sos")
@RequiredArgsConstructor
public class SOSController {
  private final SOSService sosService;

  @PostMapping({"", "/"})
  public ResponseEntity<AlerteSOS> create(@Valid @RequestBody SOSRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(sosService.createAlert(request));
  }

  @GetMapping("/mes-alertes")
  public List<AlerteSOS> mine() {
    return sosService.mine();
  }
}
