# Déploiement MboaRide

| Élément | Où | Coût |
|---|---|---|
| Base PostgreSQL | Supabase, projet `mboaride` (Francfort, `oeftcpppieknrfxjklpr`) | gratuit |
| Backend Spring Boot + back-office | Render, service `mboaride-api` (Francfort, Docker) | gratuit |
| Application Android | APK construit avec l'URL Render | gratuit |

## Base de données (fait)

- Schéma PostgreSQL : `mboaride-backend/src/main/resources/db/mboaride/postgresql/V1__schema_mboa_ride.sql`
  (Flyway choisit `mysql/` ou `postgresql/` selon la base, grâce à `{vendor}`).
- Toutes les données locales (398 lignes, 27 tables) ont été copiées le 19/11/2026 avec
  `scripts/migration-supabase/` (export MySQL → SQL Postgres, puis import avec reprise après coupure réseau).
- L'application se connecte avec le rôle `mboaride_app`, propriétaire des tables. Les rôles publics de
  Supabase (`anon`, `authenticated`) n'ont aucun droit : les données ne sont pas exposées par l'API Supabase.
- Le mot de passe de `mboaride_app` est dans `mboaride-backend/.env.supabase` (non versionné).

Recopier les données locales plus tard (les lignes déjà présentes sont ignorées) :
```bash
cd mboaride-backend
python3 -I scripts/migration-supabase/exporter-donnees.py /tmp/donnees.sql
set -a; source .env.supabase; set +a
DB_URL="jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require" DB_USER=mboaride_app.oeftcpppieknrfxjklpr \
  java -cp ~/.m2/repository/org/postgresql/postgresql/42.7.11/postgresql-42.7.11.jar scripts/migration-supabase/ExecuterSql.java /tmp/donnees.sql
```

## Backend sur Render

1. Créer un compte sur render.com (connexion avec GitHub).
2. **New → Blueprint**, choisir le dépôt `CityShareV2` : Render lit `render.yaml`.
3. Saisir `DB_PASSWORD` (valeur de `mboaride-backend/.env.supabase`), puis **Apply**.
4. Premier déploiement : ~8 minutes. L'API répond sur `https://mboaride-api.onrender.com/api/public/config`,
   le back-office sur `https://mboaride-api.onrender.com/admin/`.

Limites de l'offre gratuite :
- Le service s'endort après 15 minutes sans requête ; le premier appel suivant prend ~1 minute.
- Pas de disque permanent : les fichiers téléversés (documents et photos des chauffeurs, dossier `uploads/`)
  ne sont pas conservés entre deux déploiements, et ceux de l'ordinateur local n'ont pas été copiés.
  Pour les garder, il faudra les stocker dans Supabase Storage.
