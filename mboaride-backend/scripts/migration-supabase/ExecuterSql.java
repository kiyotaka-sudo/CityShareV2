import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Exécute un fichier SQL sur PostgreSQL instruction par instruction, en se reconnectant après une coupure réseau.
 * Les instructions déjà appliquées (objet existant) sont ignorées : le fichier peut être rejoué.
 * Usage : java -cp postgresql.jar ExecuterSql.java FICHIER.sql   (DB_URL, DB_USER, DB_PASSWORD dans l'environnement)
 */
public class ExecuterSql {
  public static void main(String[] args) throws Exception {
    List<String> instructions = decouper(Files.readString(Path.of(args[0])));
    String url = System.getenv("DB_URL"), user = System.getenv("DB_USER"), mdp = System.getenv("DB_PASSWORD");
    Connection cnx = null;
    int faites = 0;
    for (String sql : instructions) {
      for (int essai = 1; ; essai++) {
        try {
          if (cnx == null || cnx.isClosed()) cnx = DriverManager.getConnection(url, user, mdp);
          try (Statement st = cnx.createStatement()) { st.execute(sql); }
          break;
        } catch (SQLException e) {
          String etat = e.getSQLState() == null ? "" : e.getSQLState();
          // 42P07 table, 42710 objet, 42P06 schéma déjà existants : appliqué lors d'un essai précédent
          if (etat.equals("42P07") || etat.equals("42710") || etat.equals("42P06")) break;
          boolean reseau = etat.startsWith("08") || e.getMessage().contains("I/O") || e.getMessage().contains("entrée/sortie");
          if (!reseau || essai >= 8) throw new RuntimeException("Échec sur : " + sql.substring(0, Math.min(120, sql.length())), e);
          System.out.println("  coupure réseau, nouvel essai " + essai + "…");
          try { if (cnx != null) cnx.close(); } catch (SQLException ignore) { }
          cnx = null;
          Thread.sleep(1500L * essai);
        }
      }
      if (++faites % 50 == 0) System.out.println("  " + faites + " / " + instructions.size());
    }
    System.out.println("Terminé : " + faites + " instructions.");
    if (cnx != null) cnx.close();
  }

  /** Découpe sur les « ; » de fin de ligne, en ignorant les commentaires. */
  static List<String> decouper(String texte) {
    List<String> liste = new ArrayList<>();
    StringBuilder courant = new StringBuilder();
    for (String ligne : texte.split("\n")) {
      String l = ligne.strip();
      if (l.startsWith("--") || l.isEmpty()) continue;
      courant.append(ligne).append('\n');
      if (l.endsWith(";")) { liste.add(courant.toString().strip().replaceAll(";$", "")); courant.setLength(0); }
    }
    if (!courant.toString().isBlank()) liste.add(courant.toString().strip());
    return liste;
  }
}
