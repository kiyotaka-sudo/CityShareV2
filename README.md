# MboaRide

Application de réservation de **taxis (dépôt, ramassage) et de moto-taxis** adaptée au contexte camerounais, réalisée d'après le cahier des charges *MboaRide* (KEYCE Informatique & IA, 2026-2027).

| Composant | Technologie | Dossier |
|-----------|-------------|---------|
| API REST + temps réel (WebSocket STOMP) | Spring Boot 3.5, Java 25 | `mboaride-backend/` |
| Back-office d'administration | HTML / CSS / JavaScript servis par le backend (`/admin/`) | `mboaride-backend/src/main/resources/static/admin/` |
| Application mobile client **et** chauffeur / propriétaire | React Native (Expo 54), TypeScript | `mboaride-mobile/` |
| Base de données | MySQL 8 / MariaDB 10.4+ (Flyway) | `mboaride-backend/src/main/resources/db/mboaride/` |
| Cartographie | OpenStreetMap : tuiles Leaflet, itinéraires OSRM, géocodage Nominatim | — |
| SMS | Twilio, ou mode simulation | — |
| Mobile Money | Monetbil ou CamPay (choix dans le back-office), ou simulation | — |

> Choix d'architecture : le cahier des charges proposait Flutter/Django ; l'équipe a conservé Spring Boot + React Native, déjà maîtrisés, avec la même architecture en trois niveaux (présentation, métier REST + WebSocket, données).

---

## 1. Démarrage rapide (développement)

### Prérequis
JDK 25, MySQL/MariaDB (XAMPP convient), Node.js 18+, un téléphone avec **Expo Go** ou un émulateur Android.

### Backend
```bash
cd mboaride-backend
./apache-maven-3.9.6/bin/mvn spring-boot:run
```
Windows : double-cliquer sur `demarrer-backend.bat`.

- La base `mboa_ride` est créée automatiquement (utilisateur `root` sans mot de passe par défaut ; sinon variables `DB_URL`, `DB_USER`, `DB_PASSWORD`).
- Back-office : <http://localhost:8080/admin/> — Swagger : <http://localhost:8080/swagger-ui.html>
- Au premier démarrage : compte administrateur, agent du support et données de démonstration (désactivables avec `DEMO_DATA=false`).

### Application mobile

La carte native (MapLibre) demande une **version de développement** de l'application, installée une fois sur le simulateur ou le téléphone. Expo Go reste utilisable, avec une carte de secours plus simple.

```bash
cd mboaride-mobile
npm install
npm run ios          # simulateur iPhone (Xcode requis) : compile puis lance l'app
npm run android      # émulateur ou téléphone Android branché (Android Studio requis)
```
Les fois suivantes, `npm start` suffit : l'app installée se recharge à chaque modification.

- En développement, l'app trouve seule le backend : elle utilise l'adresse IP de l'ordinateur qui exécute Expo (port 8080). Le fichier `.env` ne sert qu'à viser un autre serveur.
- Sans Xcode ni Android Studio : `npm run apk:dev` construit la version de développement Android dans le cloud Expo (compte Expo gratuit).
- Expo Go (carte de secours Leaflet) : `npm run start:expo-go`.
- **Connexion instable pendant `npm run ios`** (échec de `pod install` sur un téléchargement) :
  - Hermes : télécharger l'archive `react-native-artifacts-0.81.5-hermes-ios-debug.tar.gz` depuis Maven Central avec `curl -C -` (reprise possible), puis relancer avec `HERMES_ENGINE_TARBALL_PATH=<chemin de l'archive> pod install` dans `mboaride-mobile/ios`.
  - ZXingObjC : une copie locale (`mboaride-mobile/vendor/zxingify-objc`) est déclarée dans `ios/Podfile`. Ce fichier est régénéré par `expo prebuild --clean` : il faudra alors remettre la ligne `pod 'ZXingObjC', :path => '../vendor/zxingify-objc'`.

**Faire rouler des véhicules pendant une démonstration** (backend démarré, SMS en mode simulation) :
```bash
cd mboaride-backend && python3 scripts/simuler-chauffeurs.py
```
Les trois chauffeurs de démo passent en ligne et circulent dans Yaoundé.

**Jouer une course complète côté chauffeurs** (pour montrer l'écran de course du client) : arrêtez d'abord `simuler-chauffeurs.py`, puis
```bash
cd mboaride-backend && python3 scripts/demo-course.py
```
Commandez une course dans l'application. Le script envoie une contre-proposition puis une acceptation. Quand vous choisissez une offre, le chauffeur roule jusqu'à vous, signale son arrivée, démarre avec votre code, roule jusqu'à la destination et termine la course. Le code de vérification est lu dans la base MySQL locale (XAMPP), car se connecter avec le compte du client fermerait sa session dans l'application.

### Comptes de démonstration

| Rôle | Connexion |
|------|-----------|
| Administrateur (back-office) | `admin@mboaride.cm` / `Admin@2026` — à changer dans « Mon compte » |
| Agent du support (back-office) | `support@mboaride.cm` / `Admin@2026` |
| Clients (app) | `690000001`, `690000002` |
| Chauffeurs taxi (app) | `691000001` (Jean), `691000002` (Brigitte, éligible Mboa Lady) |
| Conducteur moto (app) | `691000003` |
| Propriétaire de véhicules (app) | `691000010` |

Dans l'application, la connexion se fait par **code OTP**. En mode SMS simulé, le code s'affiche à l'écran et dans les logs du backend.

---

## 2. Configuration des services externes

Créer `mboaride-backend/mboaride-local.properties` (non versionné) à partir de `mboaride-local.properties.example`.

- **Twilio (SMS OTP, SOS, secours des notifications)** : `sms.mode=TWILIO` + `sms.twilio.account-sid`, `sms.twilio.auth-token`, `sms.twilio.from-number` (ou `messaging-service-sid`). Sans ces clés, le mode `SIMULATION` journalise les SMS.
- **Monetbil** : `monetbil.service-key`. Le client est redirigé vers la page Monetbil ; la notification arrive sur `/api/paiements/webhook/monetbil` et est revérifiée auprès de l'API Monetbil.
- **CamPay** : `campay.username`, `campay.password` (`campay.base-url` = démo ou production). Le client confirme par USSD sur son téléphone ; les retraits des chauffeurs sont automatiques.
- **Choix de l'agrégateur** : back-office → *Tarifs et paramètres* → *Agrégateur Mobile Money* (Monetbil / CamPay / Simulation). Un agrégateur sans clés retombe sur la simulation.
- **URL publique** (`mboaride.public-url`) : nécessaire pour les webhooks, les liens de suivi partagés et les reçus. En local : `ngrok http 8080`.
- **Notifications push** : via l'API Expo Push, actives dans un build de l'application (EAS). Dans Expo Go, le serveur bascule automatiquement sur le SMS pour les notifications importantes.

## 3. Déploiement (Docker)
```bash
DB_PASSWORD=... JWT_SECRET=... PUBLIC_URL=https://api.exemple.cm docker compose up -d --build
```
Placer un reverse-proxy HTTPS (Nginx, Caddy) devant le port 8080. Sauvegarde quotidienne recommandée : `mysqldump mboa_ride` + volume `uploads` (BNF-05).

APK Android : renseigner l'URL du serveur dans `mboaride-mobile/eas.json` (profils `preview` et `production`), puis `npm run apk:test` (compte Expo requis).

## 4. Tests
```bash
cd mboaride-backend && ./apache-maven-3.9.6/bin/mvn test
cd mboaride-mobile && npm run typecheck
```
Les tests unitaires couvrent les fonctions critiques (BNF-10) : formule du prix de référence, fourchette α/β, tarif de ramassage, plages horaires, commissions, montant dû, détection de déviation, normalisation des numéros.

---

## 5. Couverture du cahier des charges

| Exigences | Réalisation |
|-----------|-------------|
| BF-01 à BF-06 Comptes | OTP SMS, profil/langue/contacts de confiance, chauffeurs créés par l'admin avec CNI, permis, carte grise, assurance, photo véhicule, selfie ; compte inactif jusqu'à validation ; suppression/anonymisation ; rappel d'expiration quotidien |
| BF-07 à BF-15 Réservation | 3 services, départ GPS ou repère, prix/distance/durée avant confirmation, envoi aux chauffeurs proches compatibles, suivi temps réel, appel et messagerie, annulation avec frais après délai paramétrable, course planifiée, historique et reçu PDF |
| 5.3 / BF-16 à BF-21 Dépôt et ramassage | Dépôt privé ≤ 4 passagers ; ramassage par direction (écart angulaire) et places libres, prix officiel par place + supplément km, plusieurs places, places mises à jour à la prise en charge et à la descente, avertissement d'arrêts |
| BF-22 à BF-27 Tarification | P_ref = prise en charge + km + min, majorations zone / nuit / pointe / pluie (Open-Meteo ou manuelle) / demande-offre, fourchette α/β, une contre-proposition par chauffeur, choix sous 60 s puis relance au prix de référence, prix final figé et imprimé sur le reçu, codes promo et parrainage |
| BF-28 à BF-31 Moto | 1 passager, confirmation du casque, recommandée pour les trajets courts, désactivable par zone et par horaire |
| BF-32 à BF-36 Géolocalisation | Position chauffeur toutes les 5 s, repères locaux (base + propositions validées par l'admin), lieux favoris, itinéraire OSRM et ouverture du GPS du téléphone |
| BF-37 à BF-42 Paiement | Espèces, MTN MoMo, Orange Money, portefeuille ; paiement Mobile Money déclenché en fin de course ; commission automatique ; retraits ; commission des courses en espèces débitée du portefeuille chauffeur |
| BF-43 à BF-48 Sécurité | SOS (support + contacts de confiance par SMS, position suivie), lien de suivi public, code à 4 chiffres ou QR code, détection d'arrêt prolongé et de déviation, option Mboa Lady |
| BF-49 à BF-52 Évaluation | Notation mutuelle, suspension automatique sous le seuil, réclamations avec numéro de suivi et statut |
| BF-53 à BF-57 Espace chauffeur | Disponibilité en un geste, demandes avec prix / distance / destination, gains jour / semaine / mois et commissions, carte des zones de forte demande, suivi de flotte du propriétaire |
| BF-58 à BF-64 Back-office | Tableau de bord, validation/suspension des chauffeurs, tarifs/fourchette/commissions/zones, SOS et réclamations, utilisateurs et rôles (ADMIN / SUPPORT), promos et campagnes, exports Excel et PDF |
| BF-65 à BF-67 Notifications | Push (chauffeur assigné, arrivé, course terminée, paiement reçu), SMS de secours, messages dans la langue de l'utilisateur |
| BNF | Temps de réponse du prix (OSRM avec délai 2 s et repli local), relances automatiques réseau faible, cartes OSM mises en cache, mode économie de batterie, JWT + BCrypt + journal d'administration, consentement / export / effacement / purge des traces GPS à 90 jours, interface FR/EN |

Plan de refonte visuelle de l'application (animations, carte MapLibre, images) : [docs/PLAN-FRONTEND.md](docs/PLAN-FRONTEND.md).

Non couvert par le code (hors périmètre logiciel) : le dossier Merise, les maquettes, l'autorisation du ministère des Transports et les comptes marchands Twilio / Monetbil / CamPay.
