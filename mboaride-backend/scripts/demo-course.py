"""
Démonstration d'une course complète, côté chauffeurs, pour tester l'écran de course du client.

1. Le client commande une course dans l'application.
2. Le script fait répondre deux chauffeurs de démo : une contre-proposition puis une acceptation (offres en cascade).
3. Quand le client a choisi, le chauffeur retenu roule le long de la route jusqu'au point de départ,
   signale son arrivée, démarre avec le code du client, roule jusqu'à la destination et termine la course.

Arrêtez d'abord simuler-chauffeurs.py : sinon les deux scripts envoient des positions contradictoires.
Le code de vérification n'est connu que du client : en démo, le script le lit dans la base locale
(se connecter avec le compte du client fermerait sa session dans l'application, une seule session étant autorisée).
Usage : python3 scripts/demo-course.py [URL_API] [CLIENT_MYSQL]
Le backend doit être en mode SMS simulé (sms.mode=SIMULATION) et la course ne doit pas être planifiée.
"""
import json
import math
import subprocess
import sys
import time
import urllib.parse
import urllib.request

sys.stdout.reconfigure(line_buffering=True)

API = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/api'
MYSQL = sys.argv[2] if len(sys.argv) > 2 else '/Applications/XAMPP/xamppfiles/bin/mysql'
CHAUFFEURS = ['691000001', '691000002']
PAS_M = 45          # distance parcourue entre deux positions (accélérée pour la démo)
INTERVALLE_S = 2    # l'application anime la voiture entre deux positions


def appel(methode, chemin, corps=None, jeton=None):
    req = urllib.request.Request(API + chemin, method=methode, data=json.dumps(corps).encode() if corps is not None else None)
    req.add_header('Content-Type', 'application/json')
    if jeton:
        req.add_header('Authorization', 'Bearer ' + jeton)
    with urllib.request.urlopen(req, timeout=15) as r:
        texte = r.read().decode()
        return json.loads(texte) if texte else None


def connecter(tel):
    code = appel('POST', '/auth/otp/demander', {'telephone': tel}).get('codeDev')
    if not code:
        sys.exit('Le backend doit être en mode SMS simulé (sms.mode=SIMULATION).')
    return appel('POST', '/auth/otp/verifier', {'telephone': tel, 'code': code})['token']


def distance_m(a, b):
    k = math.cos(math.radians(a[0]))
    return math.hypot((b[0] - a[0]) * 111320, (b[1] - a[1]) * 111320 * k)


def echantillonner(trace, pas):
    """Points espacés régulièrement le long de l'itinéraire."""
    points, reste = [trace[0]], 0.0
    for a, b in zip(trace, trace[1:]):
        d = distance_m(a, b)
        pos = pas - reste
        while pos <= d:
            t = pos / d
            points.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            pos += pas
        reste = d - (pos - pas)
    points.append(trace[-1])
    return points


def rouler(jeton, de, vers, etape):
    q = urllib.parse.urlencode({'deLat': de[0], 'deLng': de[1], 'versLat': vers[0], 'versLng': vers[1]})
    trace = [tuple(p) for p in appel('GET', '/carte/itineraire?' + q, jeton=jeton)['trace']]
    points = echantillonner(trace, PAS_M)
    print(f'  {etape} : {len(points)} positions (~{len(points) * INTERVALLE_S} s)')
    for lat, lng in points:
        appel('POST', '/chauffeur/position', {'lat': lat, 'lng': lng}, jeton)
        time.sleep(INTERVALLE_S)


jetons = {t: connecter(t) for t in CHAUFFEURS}
for t, j in jetons.items():
    appel('PUT', '/chauffeur/disponibilite', {'disponible': True, 'lat': 3.8667, 'lng': 11.5167}, j)
print('Chauffeurs en ligne. Commandez une course dans l’application…')

# 1. Attente d'une demande
demande = None
while not demande:
    for d in appel('GET', '/chauffeur/demandes', jeton=jetons[CHAUFFEURS[0]]) or []:
        if not d.get('dejaRepondu') and not d.get('datePlanifiee'):
            demande = d
            break
    time.sleep(2)
cid, depart, arrivee = demande['courseId'], demande['depart'], demande['arrivee']
print(f'Demande reçue : course {cid} ({demande["prixPropose"]} FCFA)')

# Les chauffeurs se placent à ~1,2 km du client avant de répondre
origine = (depart['lat'] + 0.009, depart['lng'] + 0.006)
for j in jetons.values():
    appel('POST', '/chauffeur/position', {'lat': origine[0], 'lng': origine[1]}, j)

# 2. Offres en cascade
time.sleep(3)
contre = min(demande['prixMax'], demande['prixPropose'] + 200) if demande.get('negociable') else None
if contre:
    appel('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'CONTRE_PROPOSITION', 'prix': contre, 'casqueConfirme': True}, jetons[CHAUFFEURS[1]])
    print(f'  contre-proposition à {contre} FCFA')
    time.sleep(4)
appel('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'ACCEPTATION', 'casqueConfirme': True}, jetons[CHAUFFEURS[0]])
print('  acceptation au prix proposé. Choisissez une offre dans l’application…')

# 3. Attente du choix du client
gagnant = None
debut_attente = time.time()
while not gagnant:
    for t, j in jetons.items():
        if any(c['id'] == cid for c in appel('GET', '/chauffeur/courses/actives', jeton=j) or []):
            gagnant = t
    if time.time() - debut_attente > 300:
        sys.exit('Aucune offre choisie en 5 minutes : course annulée ou expirée ?')
    time.sleep(2)
j = jetons[gagnant]
print(f'Chauffeur retenu : {gagnant}')

# 4. Approche, arrivée, code, trajet, fin
rouler(j, origine, (depart['lat'], depart['lng']), 'approche')
appel('POST', f'/chauffeur/courses/{cid}/arrivee', jeton=j)
print('  arrivé au point de départ')
time.sleep(8)
code = subprocess.run([MYSQL, '-u', 'root', '-N', '-B', 'mboa_ride', '-e', f'SELECT code_verification FROM course WHERE id = {int(cid)}'],
                      capture_output=True, text=True, check=True).stdout.strip()
appel('POST', f'/chauffeur/courses/{cid}/demarrer', {'code': code}, j)
print('  course démarrée avec le code', code)
rouler(j, (depart['lat'], depart['lng']), (arrivee['lat'], arrivee['lng']), 'trajet')
appel('POST', f'/chauffeur/courses/{cid}/terminer', jeton=j)
print('Course terminée.')
