package cm.cityshare.service;

import cm.cityshare.config.MonetbilProperties;
import cm.cityshare.dto.response.PaymentInitResponse;
import cm.cityshare.entity.Paiement;
import cm.cityshare.entity.Passager;
import cm.cityshare.entity.Reservation;
import cm.cityshare.enums.StatutReservation;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.repository.PaiementRepository;
import cm.cityshare.repository.ReservationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class MonetbilService {
  private final MonetbilProperties properties;
  private final PaiementRepository paiementRepository;
  private final ReservationRepository reservationRepository;
  private final AuthService authService;
  private final RestTemplate restTemplate = new RestTemplate();
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Transactional
  public PaymentInitResponse initPayment(Long reservationId, String phone, String operator) {
    if (!(authService.currentUser() instanceof Passager)) {
      throw new IllegalArgumentException("Seul le passager peut payer une réservation");
    }
    Reservation reservation = reservationRepository.findById(reservationId)
        .orElseThrow(() -> new ResourceNotFoundException("Réservation introuvable"));
    if (!reservation.getPassager().getId().equals(authService.currentUser().getId())) {
      throw new IllegalArgumentException("Réservation invalide");
    }
    String paymentRef = "CS-" + reservationId + "-" + UUID.randomUUID().toString().substring(0, 8);
    Paiement paiement = Paiement.builder()
        .reservation(reservation)
        .montant(reservation.getPrixTotal())
        .paymentRef(paymentRef)
        .operateur(normalizeOperator(operator))
        .statut("EN_ATTENTE")
        .build();
    paiement = paiementRepository.save(paiement);

    if (properties.getServiceKey() == null || properties.getServiceKey().isBlank()) {
      paiement.setStatut("SIMULE");
      paiement.setPaymentUrl(null);
      paiementRepository.save(paiement);
      return toInitResponse(paiement, null);
    }

    String paymentUrl = requestPaymentUrl(paiement, reservation, phone);
    paiement.setPaymentUrl(paymentUrl);
    paiementRepository.save(paiement);
    return toInitResponse(paiement, paymentUrl);
  }

  @Transactional
  public void handleNotification(Map<String, Object> body) {
    String paymentRef = stringVal(body.get("payment_ref"));
    String status = stringVal(body.get("status"));
    if (paymentRef == null) {
      return;
    }
    Paiement paiement = paiementRepository.findByPaymentRef(paymentRef)
        .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable"));
    paiement.setUpdatedAt(LocalDateTime.now());
    paiement.setMonetbilTransactionId(stringVal(body.get("transaction_id")));
    paiement.setOperateur(stringVal(body.get("operator")));
    if ("success".equalsIgnoreCase(status) || "SUCCESS".equalsIgnoreCase(status)) {
      paiement.setStatut("PAYE");
      Reservation reservation = paiement.getReservation();
      if (reservation.getStatut() == StatutReservation.EN_ATTENTE) {
        reservation.setStatut(StatutReservation.CONFIRMEE);
        reservationRepository.save(reservation);
      }
    } else {
      paiement.setStatut("ECHEC");
    }
    paiementRepository.save(paiement);
  }

  public PaymentInitResponse status(Long reservationId) {
    Paiement paiement = paiementRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId)
        .orElseThrow(() -> new ResourceNotFoundException("Aucun paiement"));
    return toInitResponse(paiement, paiement.getPaymentUrl());
  }

  @Transactional
  public PaymentInitResponse simulateSuccess(Long reservationId) {
    Paiement paiement = paiementRepository.findTopByReservationIdOrderByCreatedAtDesc(reservationId)
        .orElseThrow(() -> new ResourceNotFoundException("Aucun paiement"));
    paiement.setStatut("PAYE");
    paiement.setUpdatedAt(LocalDateTime.now());
    paiementRepository.save(paiement);
    Reservation reservation = paiement.getReservation();
    reservation.setStatut(StatutReservation.CONFIRMEE);
    reservationRepository.save(reservation);
    return toInitResponse(paiement, paiement.getPaymentUrl());
  }

  private String requestPaymentUrl(Paiement paiement, Reservation reservation, String phone) {
    String url = properties.getApiBase() + "/" + properties.getWidgetVersion() + "/" + properties.getServiceKey();
    MultiValueMap<String, String> payload = new LinkedMultiValueMap<>();
    payload.add("amount", String.valueOf(paiement.getMontant().intValue()));
    payload.add("phone", normalizePhone(phone, reservation.getPassager().getTelephone()));
    payload.add("phone_lock", "false");
    payload.add("operator", paiement.getOperateur());
    payload.add("country", "CM");
    payload.add("currency", "XAF");
    payload.add("locale", "fr");
    payload.add("payment_ref", paiement.getPaymentRef());
    payload.add("item_ref", "reservation_" + reservation.getId());
    payload.add("user", reservation.getPassager().getTelephone());
    payload.add("first_name", safeValue(reservation.getPassager().getPrenom()));
    payload.add("last_name", safeValue(reservation.getPassager().getNom()));
    payload.add("email", safeValue(reservation.getPassager().getEmail()));
    payload.add("notify_url", properties.getNotifyUrlBase() + "/api/payments/monetbil/notify");
    payload.add("return_url", properties.getReturnUrlBase() + "?ref=" + paiement.getPaymentRef());
    payload.add("cancel_url", properties.getReturnUrlBase() + "?cancel=1&ref=" + paiement.getPaymentRef());

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(payload, headers);
    try {
      ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
      JsonNode json = objectMapper.readTree(response.getBody());
      if (json.has("payment_url")) {
        return json.get("payment_url").asText();
      }
      log.warn("Monetbil response without payment_url: {}", response.getBody());
      throw new IllegalStateException("Réponse Monetbil invalide");
    } catch (Exception ex) {
      log.error("Monetbil init failed", ex);
      throw new IllegalStateException("Impossible d'initialiser le paiement Mobile Money");
    }
  }

  private static String normalizePhone(String phone, String fallback) {
    String raw = (phone != null && !phone.isBlank()) ? phone : fallback;
    if (raw == null) {
      return "";
    }
    String digits = raw.replaceAll("\\D", "");
    if (digits.startsWith("237")) {
      return digits;
    }
    if (digits.startsWith("6") && digits.length() == 9) {
      return "237" + digits;
    }
    return digits;
  }

  private static String normalizeOperator(String operator) {
    if (operator == null || operator.isBlank()) {
      return "CM_MTNMOBILEMONEY";
    }
    String value = operator.trim().toUpperCase();
    if ("MTN".equals(value) || "MOMO".equals(value) || "CM_MTNMOBILEMONEY".equals(value)) {
      return "CM_MTNMOBILEMONEY";
    }
    if ("ORANGE".equals(value) || "OM".equals(value) || "ORANGE_MONEY".equals(value)
        || "CM_ORANGEMONEY".equals(value)) {
      return "CM_ORANGEMONEY";
    }
    throw new IllegalArgumentException("Operateur Mobile Money non supporte");
  }

  private static String safeValue(String value) {
    return value == null ? "" : value;
  }

  private static String stringVal(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  private PaymentInitResponse toInitResponse(Paiement paiement, String paymentUrl) {
    return PaymentInitResponse.builder()
        .paiementId(paiement.getId())
        .paymentRef(paiement.getPaymentRef())
        .paymentUrl(paymentUrl)
        .statut(paiement.getStatut())
        .montant(paiement.getMontant())
        .devise(paiement.getDevise())
        .operateur(paiement.getOperateur())
        .build();
  }
}
