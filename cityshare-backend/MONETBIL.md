# Monetbil — MTN & Orange Money (Cameroun)

## Fichier des clés (recommandé)

Copiez `monetbil-local.properties.example` vers :

`C:\Users\USER\Desktop\CityShare\cityshare-backend\monetbil-local.properties`

### Service key — obligatoire

Monetbil affiche parfois **seulement le secret** sur la page d'intégration. La **service key** se trouve quand même ici :

1. Sur la même page, ligne **Widget de paiement** / script :
   ```html
   <script src="https://fr.monetbil.com/widget/v2.1/VOTRE_CLE_ICI.js">
   ```
   → copiez `VOTRE_CLE_ICI` dans `monetbil.service-key=`

2. Ou menu **Services** → liste de vos services → colonne **Service key**

### Service secret — optionnel pour CityShare

Notre appelle l'API Widget `POST .../widget/v2.1/{service_key}` sans envoyer le secret.
Vous pouvez quand même le coller dans `monetbil.service-secret=` pour le garder.

Sans **service-key**, l'app reste en **mode test** (bouton « Mode test » à l'écran paiement).

## Compte Monetbil

1. Récupérez **Service Key** et **Secret** sur [monetbil.com](https://www.monetbil.com).
2. Configurez l'URL de notification (webhook) vers :
   `https://VOTRE-SERVEUR/api/payments/monetbil/notify`

En développement local, Monetbil ne peut pas appeler `172.20.x.x`. Utilisez **ngrok** ou un serveur public :

```bash
ngrok http 8080
# Puis MONETBIL_NOTIFY_URL_BASE=https://xxxx.ngrok-free.app
```

## Flux dans l'app

1. Passager réserve → écran **Paiement**
2. **MTN / Orange Money** → page Monetbil (choix opérateur sur leur widget)
3. Après paiement réussi → réservation `CONFIRMEE` → QR embarquement conducteur

## Test sans Monetbil

Écran paiement → **Mode test (sans Monetbil)**.
