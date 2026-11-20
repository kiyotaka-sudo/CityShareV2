# Démonstration base de données — MboaRide

Support pour la présentation au professeur (cours *Vues, Déclencheurs et Procédures Stockées*). Il couvre deux parties :

- **A.** les notions du cours appliquées à la base `mboa_ride`, montrées dans phpMyAdmin ;
- **B.** les outils qui montrent le trajet complet d'une donnée, de l'application jusqu'à la base, puis le retour.

---

## A. Les notions du cours dans phpMyAdmin

### Préparation (une seule fois)

1. Démarrer XAMPP (Apache + MySQL), puis ouvrir http://localhost/phpmyadmin.
2. Onglet **Importer** (ou **SQL**), puis exécuter dans l'ordre les fichiers de `mboaride-backend/sql/cours/` :

| Fichier | Notion du cours | Ce qui est créé |
|---|---|---|
| `01_vues.sql` | Vues | 5 vues |
| `02_declencheurs.sql` | Déclencheurs | 4 triggers + 2 tables d'audit |
| `03_procedures.sql` | Procédures stockées | 4 procédures (paramètres IN et OUT) |
| `04_utilisateurs_privileges.sql` | DCL : GRANT, REVOKE, rôles | 5 comptes, 3 rôles |
| `05_demonstration.sql` | Exercices | requêtes à montrer en direct |
| `06_journal_requetes.sql` | Observation | journal des requêtes SQL |

Les scripts peuvent être rejoués sans erreur.

### Où le montrer dans phpMyAdmin

| Notion | Où cliquer | Ce qu'on voit |
|---|---|---|
| Schéma relationnel | base `mboa_ride` → **Concepteur** | les 27 tables et leurs clés étrangères |
| Vues | `mboa_ride` → liste des tables, type « Vue » | `vue_courses_detaillees`, `vue_classement_chauffeurs`… |
| Déclencheurs | `mboa_ride` → onglet **Déclencheurs** | 4 triggers (`BEFORE INSERT`, `AFTER INSERT`, `AFTER UPDATE`) |
| Procédures | `mboa_ride` → onglet **Routines** → **Exécuter** | saisie des paramètres IN, affichage des OUT |
| Comptes et rôles | accueil → **Comptes d'utilisateurs** | `mboa_backend`, `mboa_support`, `mboa_analyste`… |
| Plan d'exécution | après une requête → **Expliquer SQL** | index utilisés, nombre de lignes lues |

### Les objets créés

**Vues**
- `vue_courses_detaillees` : une course avec son client, son chauffeur et son véhicule (3 jointures).
- `vue_utilisateurs_publics` : **sécurité**, sans mot de passe ni jeton, et avec le téléphone masqué (`+237690****01`).
- `vue_classement_chauffeurs` : note, courses terminées, gains et commissions (`GROUP BY`).
- `vue_chiffre_affaires_journalier` : chiffre d'affaires par jour.
- `vue_courses_en_cours` : une vue construite sur une autre vue.

**Déclencheurs**
- `trg_notation_verif_note` (BEFORE INSERT) : refuse une note hors de 1 à 5 étoiles (`SIGNAL SQLSTATE '45000'`).
- `trg_course_historique_creation` (AFTER INSERT) et `trg_course_historique_statut` (AFTER UPDATE) : journalisent chaque étape d'une course dans `historique_statut_course` (RECHERCHE → ACCEPTEE → EN_COURS → TERMINEE).
- `trg_utilisateur_historique_solde` (AFTER UPDATE) : chaque variation du portefeuille est enregistrée dans `historique_solde` (OLD.solde → NEW.solde).

**Procédures**
- `ps_stats_chauffeur(IN id, OUT nb_courses, OUT gains, OUT note)`
- `ps_recalculer_note(IN id)` : recalcule la note moyenne à partir de `notation` (`UPDATE`).
- `ps_chiffre_affaires_periode(IN debut, IN fin)` : contrôle par `IF`, puis rapport par service.
- `ps_historique_client(IN telephone)` : utilise une vue.

**Comptes : principe du moindre privilège**

| Compte | Mot de passe (démo) | Droits |
|---|---|---|
| `mboa_admin_bd` | AdminBD2026! | tout sur `mboa_ride`, `WITH GRANT OPTION` |
| `mboa_backend` | Backend2026! | SELECT, INSERT, UPDATE, DELETE, EXECUTE (pas de DROP) : **compte utilisé par l'API** |
| `mboa_support` | Support2026! | rôle `role_support` : vues des courses, mise à jour des réclamations et SOS |
| `mboa_analyste` | Analyste2026! | rôle `role_analyste` : statistiques et procédures, aucune donnée personnelle |
| `mboa_auditeur` | Auditeur2026! | rôle `role_auditeur` : tables d'audit remplies par les triggers |

Résultats vérifiés le 19/11/2026 :
- une note de 9 est refusée par le trigger ;
- `mboa_support` voit les 47 courses par la vue, mais reçoit `SELECT command denied` sur `utilisateur` ;
- `mboa_backend` reçoit `DROP command denied` ;
- `mboa_analyste` peut exécuter `ps_stats_chauffeur`.

---

## B. Voir le trajet d'une requête : application → API → base → application

```
 Application mobile / back-office web
        │  ① requête HTTP (JSON)            ▲  ⑥ réponse JSON
        ▼                                   │
 Backend Spring Boot (port 8080)  ─ ② contrôleur → service → Hibernate génère le SQL
        │  ③ requête SQL (protocole MySQL)  ▲  ⑤ lignes de résultat
        ▼                                   │
 MariaDB (port 3306)  ─ ④ exécution : index, triggers, procédures
```

| Étape | Outil (gratuit) | Ce qu'il montre |
|---|---|---|
| ① et ⑥ App ↔ API | **Proxyman** (macOS, simulateur iPhone) ou **HTTP Toolkit** (Android, émulateur ou téléphone) | chaque requête HTTP : URL, en-têtes, jeton, corps JSON envoyé et reçu, durée |
| ① et ⑥ back-office web | **Outils de développement du navigateur** (F12 → Réseau) | appels de `/admin/` vers l'API, et messages WebSocket du temps réel |
| ① tester l'API seule | **Swagger UI** : http://localhost:8080/swagger-ui.html | envoyer une requête à la main et voir la réponse JSON |
| ② traitement dans l'API | **Console du backend en mode démo** (`./demarrer-backend-demo.sh`) | la requête HTTP reçue, le SQL généré avec ses valeurs, le nombre de requêtes et le temps passé en base, la réponse écrite |
| ③ et ⑤ sur le réseau | **Wireshark**, interface *Loopback (lo0)*, filtre `mysql` | les paquets *Request Query* (SQL en clair) et *Response* (lignes renvoyées) |
| ④ dans la base | **phpMyAdmin** : table `mysql.general_log` (script `06`), puis **État → Processus** et **État → Moniteur** | chaque requête reçue avec l'heure et le compte (`mboa_backend`), les connexions actives, un graphique en direct |
| ④ coût d'une requête | phpMyAdmin → **Expliquer SQL** | plan d'exécution (index, lignes parcourues) |

Exemple réel de la console en mode démo, pour l'écran « Profil » (`GET /api/moi`) :

```
DispatcherServlet   : GET "/api/moi"
org.hibernate.SQL   : select u1_0.id, u1_0.nom, … from utilisateur u1_0 where u1_0.id=?
jdbc.bind           : binding parameter (1:BIGINT) <- [3]
Session Metrics     : 1 JDBC statement — 1,2 ms
RequestResponseBody : Writing [UtilisateurDto[id=3, nom=Mbarga, prenom=Ernest, …]]
```

Pour Wireshark, la connexion locale à MariaDB n'est pas chiffrée (`useSSL=false`) : le texte SQL et les données sont donc lisibles. En production (Render → Supabase), tout est chiffré en TLS, et Wireshark n'y verrait que des octets illisibles. C'est un bon point à expliquer.

---

## C. Scénario de démonstration (environ 10 minutes)

1. **Préparer**
   - XAMPP démarré ; script `06_journal_requetes.sql` exécuté (le journal est vide) ;
   - backend lancé avec `./demarrer-backend-demo.sh` ;
   - Proxyman ouvert ;
   - application ouverte dans le simulateur.
2. **Commander une course** dans l'application (client `690000001`).
   - **Proxyman** : `POST /api/courses` avec le corps JSON (départ, arrivée, prix proposé) et la réponse (référence, statut `RECHERCHE`).
   - **Console** : les `insert into course …` générés par Hibernate, avec leurs valeurs.
   - **phpMyAdmin**, `mysql.general_log` : les mêmes requêtes, reçues par MariaDB sous le compte `mboa_backend`.
   - **Déclencheur** : `SELECT * FROM historique_statut_course ORDER BY id DESC;` montre une ligne `NULL → RECHERCHE`, ajoutée automatiquement.
3. **Faire accepter puis terminer la course** (compte chauffeur, ou script `scripts/demo-course.py`).
   - `historique_statut_course` affiche tout le parcours de la course.
   - `vue_classement_chauffeurs` et `vue_chiffre_affaires_journalier` sont mises à jour sans aucun code supplémentaire.
4. **Procédure** : `CALL ps_stats_chauffeur(6, @n, @g, @note); SELECT @n, @g, @note;`
5. **Sécurité**
   - Se connecter à phpMyAdmin avec `mboa_support` : la vue fonctionne, la table `utilisateur` est refusée.
   - Exécuter `SHOW GRANTS`, puis un `REVOKE`.
6. **Retour des données** : dans Proxyman, ouvrir la réponse JSON de `GET /api/courses`, puis montrer la même liste à l'écran de l'application.

**Après la présentation**
- Désactiver le journal SQL : `SET GLOBAL general_log = 'OFF';`.
- Revenir au backend normal : `cd mboaride-backend && ./apache-maven-3.9.6/bin/mvn spring-boot:run`.

Remarque : ces objets (vues, triggers, procédures, comptes) n'existent que dans la base MySQL locale de démonstration. La base de production sur Supabase (PostgreSQL) ne les contient pas.
