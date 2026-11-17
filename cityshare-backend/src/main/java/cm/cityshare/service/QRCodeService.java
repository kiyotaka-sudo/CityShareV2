package cm.cityshare.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import org.springframework.stereotype.Service;

@Service
public class QRCodeService {
  public String generateQRCodeBase64(String token) {
    try {
      QRCodeWriter writer = new QRCodeWriter();
      BitMatrix matrix = writer.encode(token, BarcodeFormat.QR_CODE, 300, 300);
      ByteArrayOutputStream baos = new ByteArrayOutputStream();
      MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
      return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
    } catch (Exception ex) {
      throw new IllegalArgumentException("QR Code impossible à générer");
    }
  }
}
