package cm.mboaride.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

/** Export des rapports au format Excel (BF-64). */
@Service
public class ExcelService {
  public byte[] classeur(String nomFeuille, List<String> entetes, List<List<Object>> lignes) {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet(nomFeuille);
      CellStyle style = wb.createCellStyle();
      Font font = wb.createFont();
      font.setBold(true);
      font.setColor(IndexedColors.WHITE.getIndex());
      style.setFont(font);
      style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
      style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      Row header = sheet.createRow(0);
      for (int i = 0; i < entetes.size(); i++) {
        Cell cell = header.createCell(i);
        cell.setCellValue(entetes.get(i));
        cell.setCellStyle(style);
      }
      int r = 1;
      for (List<Object> ligne : lignes) {
        Row row = sheet.createRow(r++);
        for (int i = 0; i < ligne.size(); i++) {
          Object v = ligne.get(i);
          Cell cell = row.createCell(i);
          if (v instanceof Number n) {
            cell.setCellValue(n.doubleValue());
          } else if (v != null) {
            cell.setCellValue(String.valueOf(v));
          }
        }
      }
      for (int i = 0; i < entetes.size(); i++) {
        sheet.autoSizeColumn(i);
      }
      sheet.createFreezePane(0, 1);
      wb.write(out);
      return out.toByteArray();
    } catch (IOException ex) {
      throw new IllegalStateException("Export Excel impossible", ex);
    }
  }
}
