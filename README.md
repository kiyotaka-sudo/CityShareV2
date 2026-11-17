# CityShare

Application de covoiturage et livraison de colis (Cameroun) — React Native (Expo) + Spring Boot + PostgreSQL.

## Démarrage rapide

### Backend

1. PostgreSQL : base `cityshare`, utilisateur `cityshare_user` / mot de passe `1234` (voir `cityshare-backend/src/main/resources/application.properties`).
2. **Java** : le projet cible **Java 21**. Si vous avez JDK 25 installé, Maven peut quand même compiler grâce à Lombok ≥ 1.18.40 (déjà configuré dans `pom.xml`). En cas de souci, installez [Temurin 21](https://adoptium.net/) et définissez `JAVA_HOME` dessus.
3. Si le backend échoue sur Flyway **V2** avec `must be owner of table utilisateur` :
   ```powershell
   psql -U postgres -d cityshare -f scripts/fix-db-ownership.sql
   ```
   (adapter `-U postgres` et le mot de passe selon votre installation PostgreSQL)

4. `cd cityshare-backend` puis :
   ```powershell
   .\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
   ```
3. API : http://localhost:8080/api — Swagger : http://localhost:8080/swagger-ui.html

Comptes démo (premier lancement, base vide) — mot de passe : `password`

| Rôle | Téléphone |
|------|-----------|
| Conducteur | +237691000001 |
| Passager | +237691000002 |
| Expéditeur | +237691000003 |

### Frontend

1. `cd cityshare-frontend && npm install`
2. Copier `.env.example` vers `.env` et mettre l’IP LAN de votre PC (pas `localhost` sur téléphone physique).
3. `npx expo start`

## Fonctionnalités corrigées

- Endpoint conducteur `GET /api/trajets/mes-trajets`
- Mes trajets passager via réservations
- QR `CITYSHARE:{id}:{token}` + validation alignée API
- Confirmation d’arrivée (Dead Man Switch)
- Contact d’urgence, push FCM (token), messagerie avec historique REST
- Arrêts intermédiaires à la création de trajet
- Configuration API via variables d’environnement
