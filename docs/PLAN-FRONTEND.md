# MboaRide — Plan d'amélioration du frontend mobile

**Objectif** : une application au niveau d'Uber, Yango, Bolt ou Ongo. Carte vivante, voitures qui glissent et tournent dans les virages, transitions fluides, retours haptiques. L'application doit rester légère et fluide sur un Android d'entrée de gamme (2 Go de RAM, 3G), conformément aux exigences BNF-02 et BNF-03 du cahier des charges.

Priorités demandées : **l'accueil** et **les courses** (côté client et côté chauffeur).

---

## 1. Ce qu'on vise : les « moments signature »

Ce sont les instants qui font qu'une application de VTC paraît haut de gamme. Chacun sera travaillé avec soin :

| # | Moment | Ce que voit l'utilisateur |
|---|--------|---------------------------|
| 1 | Ouverture | Le pin du logo tombe, rebondit, puis une route jaune-verte se dessine dessous. Le mot « MboaRide » apparaît en fondu. Durée totale : 1,2 s. |
| 2 | Accueil client | Carte plein écran, centrée en douceur sur la position du client. Les voitures et motos disponibles autour **roulent lentement et tournent** (positions réelles anonymisées). Un panneau glissant « Où allez-vous ? » monte du bas de l'écran. |
| 3 | Choix de la destination | Le tracé de l'itinéraire **se dessine** du départ vers l'arrivée. Le pin d'arrivée tombe avec un rebond. La caméra recadre le trajet en un mouvement continu. |
| 4 | Choix du service | Cartes horizontales avec illustration du véhicule. Le prix défile comme un compteur. La carte sélectionnée grossit légèrement, avec une vibration courte. |
| 5 | Négociation | Curseur de prix aimanté par pas de 50 FCFA, une vibration à chaque cran. La fourchette α/β est affichée sous forme de jauge colorée. |
| 6 | Recherche d'un chauffeur | Effet radar (ondes concentriques orange) autour du point de départ. Un anneau de compte à rebours de 60 s. Les offres **arrivent en cascade** depuis le bas, chacune avec un retour haptique. |
| 7 | Chauffeur en route | La voiture du chauffeur **avance le long de la route**, sans sauts entre deux positions GPS. Le temps d'arrivée se met à jour en douceur. La caméra suit la voiture. |
| 8 | Code de vérification | Les 4 chiffres et le QR code apparaissent l'un après l'autre (effet « carte retournée »). |
| 9 | Pendant la course | La partie déjà parcourue de l'itinéraire passe en gris, le reste en bleu marine. Une barre de progression indique « 6 min · 2,1 km restants ». |
| 10 | Fin de course | Animation de succès avec confettis aux couleurs du logo. Les étoiles « sautent » au toucher. Le montant s'anime jusqu'au total. |
| 11 | Chauffeur : passer en ligne | Bouton « glisser pour passer en ligne » (comme Uber Driver). Le fond passe au vert, avec une vibration. |
| 12 | Chauffeur : nouvelle demande | Carte plein écran qui monte, avec un anneau de temps restant, un son court et une vibration. Glisser pour accepter, toucher pour contre-proposer. |

---

## 2. Choix techniques

### 2.1 Carte : MapLibre + OpenFreeMap (gratuit, rendu natif)

| Critère | Leaflet dans une WebView (actuel) | **MapLibre natif (cible)** |
|---|---|---|
| Fluidité | Moyenne : rendu web, pas d'accélération graphique native | **60 images/s**, rendu GPU natif |
| Voitures animées | Animation en JavaScript, saccadée | Marqueurs natifs, rotation et déplacement fluides |
| Style de carte | Tuiles images fixes | **Style vectoriel personnalisé** aux couleurs MboaRide |
| Hors ligne | Cache du navigateur seulement | **Packs hors ligne** de Yaoundé et Douala (BNF-02) |
| Coût | Gratuit | **Gratuit, sans clé ni quota** (OpenFreeMap) |
| Expo Go | Oui | Non : il faut une version de développement (voir 2.3) |

- Bibliothèque : `@maplibre/maplibre-react-native`.
- Tuiles : **OpenFreeMap**, gratuit, sans clé, sans limite. Style de base « Liberty » ou « Positron », modifié avec nos couleurs.
- **Style MboaRide** : routes principales en blanc, quartiers en gris clair, eau en bleu très clair, noms de quartiers lisibles en plein soleil. Le fichier de style sera hébergé par notre backend (`/assets/map-style.json`), ce qui permet de le modifier sans republier l'application.
- **Mode nuit** : style sombre activé automatiquement entre 19 h et 6 h. C'est surtout utile pour les chauffeurs (moins d'éblouissement, moins de batterie).
- Itinéraires : on garde OSRM côté backend, déjà en place.

### 2.2 Animations et interface

| Besoin | Bibliothèque (gratuite) |
|---|---|
| Animations à 60 images/s, gestes | `react-native-reanimated` + `react-native-gesture-handler` (déjà installé) |
| Panneau glissant à crans (25 %, 50 %, 90 %) | `@gorhom/bottom-sheet` |
| Animations illustrées (radar, succès, confettis, chargement) | `lottie-react-native` + fichiers Lottie |
| Vibrations | `expo-haptics` |
| Dégradés, effets de verre dépoli | `expo-linear-gradient`, `expo-blur` |
| Images rapides avec cache et fondu | `expo-image` |
| Polices | `expo-font` + Google Fonts : **Poppins** (titres) et **Inter** (textes), licence OFL |
| Son de nouvelle demande (chauffeur) | `expo-audio` |
| Effets graphiques avancés (option) | `@shopify/react-native-skia` : radar, tracé lumineux |

### 2.3 Construction de l'application

- Passage d'**Expo Go** à une **version de développement** (`expo-dev-client`). Elle est nécessaire pour MapLibre et elle s'installe sur le téléphone comme une vraie application.
- APK de test et APK final avec **EAS Build** (offre gratuite d'Expo). Un compte Expo sera nécessaire.
- Le rechargement instantané du code pendant le développement est conservé.

---

## 3. Système de design

### 3.1 Couleurs (issues du logo, déjà en place)

| Rôle | Couleur | Usage |
|---|---|---|
| Principale | Bleu marine `#032E5D` | Boutons, titres, itinéraire, barre de navigation |
| Accent | Orange `#F78B03` | Actions secondaires, radar, onglet actif, icône |
| Succès | Vert `#047030` | Course terminée, chauffeur en ligne, paiement reçu |
| Étoiles | Jaune `#F8D902` | Notes, badges |
| Alerte | Rouge `#D64545` | SOS, annulation, erreurs |

Des dégradés seront ajoutés : marine → marine foncé (en-têtes), orange → orange foncé (boutons d'accent).

### 3.2 Typographie

- **Poppins** pour les titres et les prix : SemiBold 600 et Bold 700.
- **Inter** pour les textes : Regular 400 et Medium 500.
- Échelle : 12 / 14 / 16 / 18 / 22 / 28 / 36.
- Les prix sont affichés en chiffres à chasse fixe, pour qu'ils ne « dansent » pas pendant le défilement.

### 3.3 Règles de mouvement

| Type | Durée | Courbe |
|---|---|---|
| Petits retours (appui, interrupteur) | 150 ms | sortie rapide |
| Apparitions, cartes | 250 ms | ressort amorti (amortissement 18, raideur 180) |
| Changements d'écran, panneau glissant | 350 ms | ressort doux |
| Caméra de la carte | 600 à 900 ms | entrée-sortie douce |
| Déplacement des voitures | 5 s (intervalle GPS) | **linéaire** (vitesse constante) |

- Retours haptiques : léger pour une sélection, moyen pour une validation, « succès » en fin de course, « alerte » pour le SOS.
- Le réglage système **« Réduire les animations »** est respecté : les animations sont alors remplacées par des fondus simples (accessibilité).

### 3.4 Composants à créer

`CarteMboa` (carte MapLibre), `MarqueurVehicule` (voiture animée), `TraceAnime` (itinéraire qui se dessine), `RadarRecherche`, `AnneauCompteur`, `PanneauGlissant`, `CarteService`, `CurseurPrix`, `PrixAnime`, `BoutonGlisser`, `CarteOffre`, `CarteDemandeChauffeur`, `SqueletteChargement` (effet de brillance), `EtatVide` (illustration + texte), `BadgeStatut`, `AvatarChauffeur` (photo + note + plaque), `Toast` (notifications internes animées).

---

## 4. Les voitures qui bougent : approche technique

Le chauffeur envoie sa position toutes les 5 s (BNF-01). Pour un mouvement continu, sans téléportation :

1. **Interpolation** : chaque nouvelle position démarre une animation de 5 s, à vitesse constante, depuis la position affichée vers la nouvelle. La voiture n'est jamais immobile entre deux points.
2. **Suivi de la route** : si l'itinéraire est connu, la voiture avance **le long du tracé** (projection sur la ligne) au lieu de couper en ligne droite à travers les maisons.
3. **Rotation** : l'angle de la voiture suit le cap (calculé entre deux positions) et tourne par le **plus court chemin** (de 350° à 10°, il tourne de 20°, pas de 340°), avec un lissage.
4. **Images vues du dessus** : taxi jaune et moto, orientés vers le haut, avec une ombre portée douce. La rotation se fait sur l'image.
5. **Caméra** : en mode « suivre », la caméra se recentre doucement sur la voiture sans bloquer les gestes de l'utilisateur. Un bouton « recentrer » apparaît si l'utilisateur déplace la carte.
6. **Accueil client** : les voitures disponibles alentour, avec des positions **arrondies et légèrement décalées** (confidentialité des chauffeurs), rafraîchies toutes les 10 s et animées de la même façon.

**Ajouts nécessaires côté backend** (petits) :

- `GET /api/carte/vehicules-proches?lat=&lng=` : renvoie le type, une position arrondie et le cap des véhicules disponibles dans un rayon de 3 km. Pas d'identifiant ni de nom.
- Le cap (`cap`) sera ajouté aux événements temps réel `POSITION`.
- Le tracé de l'itinéraire (déjà calculé par OSRM) sera inclus dans le détail de course, pour l'animation côté client.
- Le fichier de style de carte sera hébergé dans `static/assets/`.

---

## 5. Refonte écran par écran

### 5.1 Ouverture et connexion

- **Écran de démarrage animé** (moment 1).
- **Présentation** : 3 écrans à faire glisser, avec illustrations (dépôt / ramassage / moto ; prix juste et négociation ; sécurité et SOS). Indicateur de page animé et bouton « Commencer ».
- **Numéro de téléphone** : drapeau du Cameroun, saisie formatée automatiquement (`6 90 00 00 00`), bouton qui s'active avec une animation.
- **Code SMS** : 6 cases séparées. Chaque chiffre « tombe » dans sa case ; un mauvais code fait secouer la rangée, avec une vibration d'erreur. Lecture automatique du SMS sur Android.

### 5.2 Accueil client (priorité 1)

- Carte **plein écran** au style MboaRide, avec les **véhicules alentour animés**.
- En haut : une pastille avec le logo, « Bonjour Aïcha » et la météo (« Il pleut, prévoyez +10 % ») ; le bouton SOS discret à droite.
- **Panneau glissant** en bas, en 3 crans :
  - Fermé : « Où allez-vous ? » et 3 raccourcis (Maison, Travail, dernier lieu).
  - Moitié : lieux favoris, derniers trajets et repères populaires proches.
  - Ouvert : recherche plein écran.
- **Carrousel de promotions** (codes promo, parrainage) avec une illustration.
- **Sélecteur de service rapide** : Taxi, Ramassage, Moto, sous forme d'icônes animées. Un appui préremplit le choix.
- Course en cours : bannière persistante en haut avec la voiture miniature et le temps d'arrivée qui s'actualise. Un appui ouvre la course.

### 5.3 Réservation (priorité 1)

Tout se passe sur **un seul écran avec la carte**, sans changement de page (BNF-08 : 3 écrans au maximum) :

1. Choix du départ et de l'arrivée dans le panneau. L'itinéraire se dessine aussitôt (moment 3).
2. Le panneau monte à 50 % et montre les **3 cartes de service** avec illustration, prix animé, temps d'arrivée du chauffeur le plus proche et badge « Recommandé ». Les services indisponibles sont grisés, avec la raison.
3. **Curseur de prix** (moment 5) avec la jauge de la fourchette autorisée.
4. Options repliables : nombre de places, paiement (logos MTN et Orange), Mboa Lady, planification, code promo.
5. Gros bouton **« Commander · 2 100 FCFA »** avec une animation de pression.

### 5.4 Recherche et négociation (priorité 1)

- La carte reste visible. Le **radar** pulse autour du point de départ et les voitures proches convergent visuellement.
- Un anneau de 60 s, et le message « 3 chauffeurs consultent votre demande ».
- **Les offres arrivent en cascade** (moment 6) : photo, note, véhicule, temps d'arrivée et prix. Une contre-proposition est marquée d'un badge orange. Un appui long montre le détail du chauffeur.
- Relance au prix de référence : petite animation « Nouvelle tentative », sans rupture.

### 5.5 Course côté client (priorité 1)

- Carte avec la **voiture animée** (moment 7) et l'itinéraire. La partie parcourue se grise pendant la course (moment 9).
- Panneau : photo du chauffeur, note, **plaque d'immatriculation dessinée comme une vraie plaque**, modèle et couleur du véhicule.
- Code de vérification et QR code (moment 8).
- Barre d'actions : Appeler, Message, Partager, SOS, chacune avec une icône animée.
- « Votre chauffeur est arrivé » : bannière qui rebondit, avec un son et une vibration.
- **Fin de course** (moment 10) : écran de succès, puis notation (étoiles animées et commentaires rapides comme « Ponctuel » ou « Conduite prudente »), puis reçu.

### 5.6 Espace chauffeur (priorité 2)

- Accueil : carte sombre la nuit et **carte de chaleur animée** des zones de forte demande (taches orange qui pulsent).
- **Bouton à glisser pour passer en ligne** (moment 11).
- Compteur de gains du jour en haut, animé à chaque course.
- **Nouvelle demande en plein écran** (moment 12) : distance de prise en charge, destination, prix proposé, mode de paiement, anneau de 60 s.
- Course : navigation intégrée sur la carte (itinéraire, distance restante), bouton « Ouvrir dans Google Maps », gros boutons adaptés à la conduite.
- Gains : graphique en barres animé, onglets jour / semaine / mois, animation de « pièces » lors d'un retrait.

### 5.7 Écrans secondaires (priorité 3)

Historique (cartes avec mini-carte du trajet), portefeuille (carte bancaire stylisée avec le solde), profil, réclamations, documents : squelettes de chargement, états vides illustrés et transitions homogènes.

---

## 6. Performance et qualité

- **Budget** : APK de moins de 30 Mo (BNF-03). Les images sont au format WebP, les animations Lottie de moins de 60 Ko chacune, les polices limitées à 4 graisses.
- **Fluidité** : animations exécutées hors du fil JavaScript (Reanimated), listes virtualisées, marqueurs de carte limités à 30.
- **Test sur un téléphone d'entrée de gamme** obligatoire à chaque étape (Android 8, 2 Go de RAM). Les animations se dégradent proprement si l'appareil est lent.
- **Réseau faible** : squelettes de chargement plutôt que des écrans blancs, cartes hors ligne, relances automatiques (déjà en place).
- **Batterie** (BNF-04) : animations de fond coupées quand l'application est en arrière-plan ; le mode économie réduit les animations de la carte.
- **Accessibilité** : contrastes vérifiés, textes agrandissables, « Réduire les animations » respecté, libellés pour les lecteurs d'écran.
- **Suivi des plantages** : Sentry (offre gratuite) dans l'APK de test.

---

## 7. Planning proposé (sprints de 2 semaines, méthode Scrum du cahier des charges)

| Sprint | Contenu | Résultat vérifiable |
|---|---|---|
| **1. Fondations** | Version de développement + EAS ; polices ; jetons de design ; MapLibre + style MboaRide ; composants de base animés (bouton, panneau glissant, squelettes, toasts) ; endpoint des véhicules proches | APK de test installé sur un Android d'entrée de gamme, carte stylée fluide |
| **2. Accueil + réservation** | Démarrage animé, présentation, connexion avec cases OTP ; accueil avec véhicules animés ; panneau à crans ; itinéraire qui se dessine ; cartes de service ; curseur de prix | Parcours « ouvrir l'app → commander » en moins de 3 écrans, 60 images/s |
| **3. Course client** | Radar et offres en cascade ; voiture animée le long de la route ; code et QR animés ; arrivée du chauffeur ; fin de course, notation, reçu | Course complète de démonstration, sans saut de la voiture |
| **4. Espace chauffeur** | Bouton à glisser ; demande plein écran avec son ; navigation intégrée ; carte de chaleur ; gains animés ; mode nuit | Parcours chauffeur complet, utilisable en conduisant (gros boutons) |
| **5. Finitions** | Images définitives, animations Lottie, écrans secondaires, accessibilité, performance, cartes hors ligne, APK final | APK de version finale de moins de 30 Mo, testé sur 2 téléphones |

---

## 8. Images et animations : ce dont j'ai besoin

Les fichiers sont à déposer dans `mboaride-mobile/assets/images/` avec **exactement** les noms indiqués. Format PNG transparent (je les convertirai en WebP), aux dimensions indiquées ou plus grandes.

### 8.1 Style commun à ajouter au début de chaque prompt ChatGPT

> Style: modern 3D illustration, soft clay render, smooth rounded shapes, soft studio lighting, subtle shadows, clean and premium mobile-app look (like Uber or Bolt illustrations). Brand palette only: navy blue #032E5D, orange #F78B03, green #047030, yellow #F8D902, white, light grey. Cameroonian context (Yaoundé, Douala). No text, no letters, no logos, no watermark. Transparent background, PNG.

### 8.2 Véhicules pour la carte (indispensables, vus du dessus)

Ils doivent être **parfaitement vus du dessus**, **orientés vers le haut** (l'avant pointant vers le haut de l'image), centrés, sans ombre au sol (l'ombre sera ajoutée par l'application).

| Fichier | Taille | Prompt (à ajouter après le style commun) |
|---|---|---|
| `vehicule-taxi.png` | 256 × 256 | Perfect top-down orthographic view of a yellow Cameroonian city taxi (compact sedan like a Toyota Corolla), seen exactly from above, front of the car pointing straight up, centered, small orange roof sign, dark tinted windows, simple clean shapes, no shadow on the ground, isolated on transparent background. |
| `vehicule-taxi-ramassage.png` | 256 × 256 | Same top-down yellow Cameroonian taxi as before, identical angle and size, with a green roof sign instead of orange, front pointing straight up, no ground shadow, transparent background. |
| `vehicule-moto.png` | 256 × 256 | Perfect top-down orthographic view of a motorbike taxi (Cameroonian "bendskin") with a driver wearing a navy helmet and an orange vest, seen exactly from above, front wheel pointing straight up, centered, simple clean shapes, no shadow on the ground, transparent background. |

### 8.3 Cartes de service (écran de réservation)

| Fichier | Taille | Prompt |
|---|---|---|
| `service-depot.png` | 600 × 400 | 3/4 front view of a shiny yellow Cameroonian taxi sedan, one happy passenger in the back seat, private ride feeling, isolated, transparent background. |
| `service-ramassage.png` | 600 × 400 | 3/4 front view of a yellow Cameroonian taxi with three different passengers inside smiling, shared ride feeling, small green leaf-shaped badge on the door, isolated, transparent background. |
| `service-moto.png` | 600 × 400 | 3/4 side view of a motorbike taxi with a driver in navy helmet and orange vest and a passenger wearing a helmet, dynamic pose, isolated, transparent background. |

### 8.4 Présentation (onboarding)

| Fichier | Taille | Prompt |
|---|---|---|
| `onboarding-1.png` | 1080 × 1080 | A vibrant Yaoundé street at golden hour with hills in the background, a yellow taxi and a motorbike taxi on the road, a smiling young Cameroonian woman holding a smartphone with a location pin floating above it, isometric 3D scene, transparent background. |
| `onboarding-2.png` | 1080 × 1080 | A smartphone showing a price slider and coins (FCFA style, no text), a friendly Cameroonian taxi driver giving a thumbs up next to it, fair price and negotiation concept, isometric 3D, transparent background. |
| `onboarding-3.png` | 1080 × 1080 | A large navy shield with a check mark protecting a passenger and a taxi, a red SOS button and a location sharing signal, safety and trust concept, isometric 3D, transparent background. |

### 8.5 États et moments clés

| Fichier | Taille | Prompt |
|---|---|---|
| `etat-aucune-course.png` | 800 × 600 | An empty city road with a single navy location pin and a small yellow taxi waiting, calm and friendly, isometric 3D, transparent background. |
| `etat-aucun-chauffeur.png` | 800 × 600 | A yellow taxi with a small clock floating above it and soft orange radar waves, "please wait" feeling, isometric 3D, transparent background. |
| `etat-portefeuille.png` | 800 × 600 | A navy wallet with orange and yellow coins and a mobile phone showing mobile money waves, isometric 3D, transparent background. |
| `succes-course.png` | 800 × 800 | A yellow taxi arriving at a destination flag, a passenger stepping out happily, green check mark and confetti in brand colors, celebration, isometric 3D, transparent background. |
| `securite-sos.png` | 800 × 600 | A smartphone with a big red SOS button, signal waves going to two trusted contacts and a support agent with a headset, reassuring not scary, isometric 3D, transparent background. |
| `chauffeur-en-ligne.png` | 800 × 600 | A smiling Cameroonian taxi driver in his yellow taxi holding a phone mounted on the dashboard, green "online" glow, isometric 3D, transparent background. |
| `chauffeur-attente-validation.png` | 800 × 600 | Documents (ID card, driving licence, insurance paper) being checked with a navy magnifying glass and an orange clock, isometric 3D, transparent background. |
| `promo-parrainage.png` | 1200 × 500 | Two friends sharing a gift box with orange ribbon next to a yellow taxi, referral reward concept, wide banner composition with empty space on the left for text, isometric 3D, transparent background. |
| `fond-motif.png` | 1080 × 1920 | Seamless subtle pattern of thin navy line icons (roads, location pins, taxis, motorbikes) on a white background, very low contrast, elegant, for app background. (Ce fichier-ci a un fond blanc, pas transparent.) |

**Conseils pour ChatGPT** :
- Générer toutes les images **dans la même conversation**, en commençant par : « Garde exactement le même style pour toutes les images suivantes ».
- Pour les véhicules vus du dessus : si l'angle n'est pas parfaitement vertical, redemander « exact orthographic top view, no perspective ».
- Si le fond n'est pas transparent, demander « remove the background, transparent PNG ».

### 8.6 Animations Lottie (gratuites)

Sur **LottieFiles.com** (filtre « Free », licence Lottie Simple License), à télécharger au format `.json` dans `mboaride-mobile/assets/lottie/`. Mots-clés de recherche :

| Fichier | Recherche sur LottieFiles | Usage |
|---|---|---|
| `radar.json` | « radar search », « location pulse » | Recherche d'un chauffeur |
| `pin-drop.json` | « location pin drop » | Choix de la destination |
| `succes.json` | « success check » | Fin de course, paiement réussi |
| `confettis.json` | « confetti » | Fin de course |
| `chargement-voiture.json` | « car loading » | Chargements longs |
| `paiement.json` | « mobile payment » | Attente de confirmation Mobile Money |

Je recolorerai les animations aux couleurs du logo dans le code. Tu peux aussi m'envoyer seulement les liens, je m'occupe du reste.

### 8.7 Polices et son

- **Polices** : Poppins et Inter (Google Fonts, gratuites). Je les installe moi-même via `@expo-google-fonts`.
- **Son de nouvelle demande** (chauffeur) : un son court et clair de 1 à 2 s, libre de droits, sur **Pixabay** (recherche « notification ding ») ou **Mixkit** (« Notification sounds »). Fichier : `mboaride-mobile/assets/sons/nouvelle-demande.mp3`.

---

## 9. Points à valider avec toi

1. **Compte Expo** (gratuit) pour construire l'APK avec EAS : il faudra le créer, puis lancer `npx eas login` depuis ton ordinateur.
2. **Téléphone Android d'entrée de gamme** pour les tests de fluidité : en as-tu un dans l'équipe ?
3. **Mode nuit** : automatique pour les chauffeurs seulement, ou aussi pour les clients ?
4. **Ordre** : je propose de commencer par le sprint 1, puis accueil + réservation, puis la course client.
