package cm.cityshare.controller;

import cm.cityshare.dto.response.PaymentInitResponse;
import cm.cityshare.service.MonetbilService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
  private final MonetbilService monetbilService;

  @PostMapping("/reservation/{reservationId}/init")
  public PaymentInitResponse init(
      @PathVariable Long reservationId,
      @RequestParam(required = false) String phone,
      @RequestParam(required = false) String operator) {
    return monetbilService.initPayment(reservationId, phone, operator);
  }

  @GetMapping("/reservation/{reservationId}/status")
  public PaymentInitResponse status(@PathVariable Long reservationId) {
    return monetbilService.status(reservationId);
  }

  /** Dev / sandbox sans clés Monetbil */
  @PostMapping("/reservation/{reservationId}/simulate")
  public PaymentInitResponse simulate(@PathVariable Long reservationId) {
    return monetbilService.simulateSuccess(reservationId);
  }

  @PostMapping("/monetbil/notify")
  public ResponseEntity<String> notify(@RequestBody Map<String, Object> body) {
    monetbilService.handleNotification(body);
    return ResponseEntity.ok("OK");
  }
}
