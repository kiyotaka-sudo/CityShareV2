# MboaRide — backend

API Spring Boot (Java 25) + back-office web. Voir le [README principal](../README.md) pour l'installation.

## Organisation du code (`cm.mboaride`)
- `entity`, `enums`, `repository` : modèle de données (migration unique `db/mboaride/V1__schema_mboa_ride.sql`)
- `service` : règles métier — `TarificationService` (prix, fourchette), `DispatchService` (chauffeurs compatibles), `CourseService` (cycle de vie), `paiement/*` (Monetbil, CamPay, simulation, règlement), `SecuriteService` (SOS, anomalies), `NotificationService` (Expo Push + SMS de secours)
- `service/admin` : tableau de bord, chauffeurs, gestion, exports
- `controller` : API mobile (`/api/...`), back-office (`/api/admin/...`), public (`/api/public/...`), webhooks
- `scheduler` : relances de négociation, courses planifiées, paiements en attente, anomalies, rappels de documents, purge des données
- `resources/static/admin` : back-office ; `suivi.html` : page publique de suivi ; `confidentialite.html`
- `resources/i18n` : messages FR/EN (erreurs et notifications)

## Temps réel
STOMP sur `/ws` (SockJS) avec l'en-tête `Authorization: Bearer <jeton>` au CONNECT. Files privées : `/user/queue/courses` (client), `/user/queue/demandes` (chauffeur), `/user/queue/messages`, `/user/queue/notifications` ; diffusion `/topic/admin/alertes`.
