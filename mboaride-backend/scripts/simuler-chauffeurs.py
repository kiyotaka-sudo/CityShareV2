"""
Simulateur de démonstration : connecte les chauffeurs de démo (SMS en mode simulation) et les fait circuler
dans Yaoundé en envoyant leur position toutes les 5 s, comme l'application chauffeur.
Usage : python3 scripts/simuler-chauffeurs.py [URL_API]   (Ctrl+C pour arrêter)
"""
import json
import math
import sys
import time
import urllib.request

sys.stdout.reconfigure(line_buffering=True)

API = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/api'
CHAUFFEURS = ['691000001', '691000002', '691000003']
# Boucles autour du centre de Yaoundé (Poste centrale, Bastos, Mokolo, Essos)
CIRCUITS = [
    [(3.8667, 11.5167), (3.8717, 11.5139), (3.8800, 11.5120), (3.8960, 11.5090), (3.8850, 11.5150), (3.8740, 11.5200)],
    [(3.8770, 11.5010), (3.8720, 11.5080), (3.8667, 11.5167), (3.8610, 11.5250), (3.8690, 11.5240), (3.8760, 11.5100)],
    [(3.8740, 11.5350), (3.8700, 11.5260), (3.8650, 11.5180), (3.8590, 11.4990), (3.8630, 11.5100), (3.8700, 11.5300)],
]
VITESSE_KMH = 28


def appel(methode, chemin, corps=None, jeton=None):
    req = urllib.request.Request(API + chemin, method=methode, data=json.dumps(corps).encode() if corps is not None else None)
    req.add_header('Content-Type', 'application/json')
    if jeton:
        req.add_header('Authorization', 'Bearer ' + jeton)
    with urllib.request.urlopen(req, timeout=10) as r:
        texte = r.read().decode()
        return json.loads(texte) if texte else None


def connecter(tel):
    code = appel('POST', '/auth/otp/demander', {'telephone': tel}).get('codeDev')
    if not code:
        sys.exit('Le backend doit être en mode SMS simulé (sms.mode=SIMULATION).')
    return appel('POST', '/auth/otp/verifier', {'telephone': tel, 'code': code})['token']


def position(circuit, distance_km):
    """Point situé à distance_km le long du circuit fermé."""
    segments = list(zip(circuit, circuit[1:] + circuit[:1]))
    longueurs = [math.dist(a, b) * 111 for a, b in segments]
    d = distance_km % sum(longueurs)
    for (a, b), l in zip(segments, longueurs):
        if d <= l:
            t = d / l
            return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        d -= l
    return circuit[0]


jetons = [connecter(t) for t in CHAUFFEURS]
for i, j in enumerate(jetons):
    lat, lng = position(CIRCUITS[i], 0)
    appel('PUT', '/chauffeur/disponibilite', {'disponible': True, 'lat': lat, 'lng': lng}, j)
print(f'{len(jetons)} chauffeurs en ligne. Envoi des positions toutes les 5 s (Ctrl+C pour arrêter).')
debut = time.time()
try:
    while True:
        km = (time.time() - debut) / 3600 * VITESSE_KMH
        for i, j in enumerate(jetons):
            lat, lng = position(CIRCUITS[i], km + i * 0.7)
            try:
                appel('POST', '/chauffeur/position', {'lat': lat, 'lng': lng}, j)
            except Exception as e:
                print('position non envoyée :', e)
        time.sleep(5)
except KeyboardInterrupt:
    for j in jetons:
        appel('PUT', '/chauffeur/disponibilite', {'disponible': False}, j)
    print('Chauffeurs repassés hors ligne.')
