package cm.cityshare.controller;

import cm.cityshare.dto.request.NotationRequest;
import cm.cityshare.entity.Notation;
import cm.cityshare.service.NotationService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notations")
@RequiredArgsConstructor
public class NotationController {
  private final NotationService notationService;

  @PostMapping({"", "/"})
  public ResponseEntity<Notation> create(@Valid @RequestBody NotationRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(notationService.create(request));
  }

  @GetMapping("/user/{userId}")
  public List<Notation> byUser(@PathVariable Long userId) {
    return notationService.byUser(userId);
  }
}
