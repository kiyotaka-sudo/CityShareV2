package cm.cityshare.controller;

import cm.cityshare.dto.request.QRValidateRequest;
import cm.cityshare.dto.request.ReservationRequest;
import cm.cityshare.dto.response.QRCodeResponse;
import cm.cityshare.dto.response.QRValidateResponse;
import cm.cityshare.dto.response.ReservationResponse;
import cm.cityshare.service.ReservationService;
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
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {
  private final ReservationService reservationService;

  @PostMapping({"", "/"})
  public ResponseEntity<ReservationResponse> create(@Valid @RequestBody ReservationRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(reservationService.createReservation(request));
  }

  @GetMapping("/mes-reservations")
  public List<ReservationResponse> mine() {
    return reservationService.mine();
  }

  @GetMapping("/conducteur/mes-passagers")
  public List<ReservationResponse> conducteurPassengers() {
    return reservationService.conducteurReservations();
  }

  @GetMapping("/{id}/qr")
  public QRCodeResponse qr(@PathVariable Long id) {
    return reservationService.getQRCode(id);
  }

  @PostMapping("/{id}/validate-qr")
  public QRValidateResponse validate(@PathVariable Long id, @Valid @RequestBody QRValidateRequest request) {
    return reservationService.validateQR(id, request.getToken());
  }

  @PostMapping("/{id}/validate-arrival-qr")
  public QRValidateResponse validateArrival(@PathVariable Long id, @Valid @RequestBody QRValidateRequest request) {
    return reservationService.validateArrivalQR(id, request.getToken());
  }

  @PostMapping("/{id}/confirmer-arrivee")
  public ReservationResponse confirmerArrivee(@PathVariable Long id) {
    return reservationService.confirmerArrivee(id);
  }
}
