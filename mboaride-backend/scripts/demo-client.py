"""
Démonstration côté client, pour tester l'espace chauffeur de l'application.

Le script se connecte avec un client de démo, commande une course près de la position donnée,
attend la réponse du chauffeur (acceptation ou contre-proposition), la choisit, puis affiche le code
de vérification à saisir dans l'application chauffeur. Il suit ensuite la course jusqu'à la fin.

Connectez l'application avec un chauffeur de démo (ex. 691000001) et arrêtez simuler-chauffeurs.py,
qui utilise les mêmes comptes (une seule session par compte).
Usage : python3 scripts/demo-client.py [LAT] [LNG] [TELEPHONE_CLIENT] [URL_API]
"""
import json
import sys
import time
import urllib.request

sys.stdout.reconfigure(line_buffering=True)

LAT = float(sys.argv[1]) if len(sys.argv) > 1 else 3.8690
LNG = float(sys.argv[2]) if len(sys.argv) > 2 else 11.5160
CLIENT = sys.argv[3] if len(sys.argv) > 3 else '690000002'
API = sys.argv[4] if len(sys.argv) > 4 else 'http://localhost:8080/api'
DESTINATION = {'lat': 3.8787, 'lng': 11.5047, 'adresse': 'Marché Mokolo, Yaoundé'}


def appel(methode, chemin, corps=None, jeton=None):
    req = urllib.request.Request(API + chemin, method=methode, data=json.dumps(corps).encode() if corps is not None else None)
    req.add_header('Content-Type', 'application/json')
    if jeton:
        req.add_header('Authorization', 'Bearer ' + jeton)
    with urllib.request.urlopen(req, timeout=15) as r:
        texte = r.read().decode()
        return json.loads(texte) if texte else None


code = appel('POST', '/auth/otp/demander', {'telephone': CLIENT}).get('codeDev')
if not code:
    sys.exit('Le backend doit être en mode SMS simulé (sms.mode=SIMULATION).')
jeton = appel('POST', '/auth/otp/verifier', {'telephone': CLIENT, 'code': code})['token']

# Une course active d'un essai précédent est annulée pour repartir proprement
try:
    req = urllib.request.Request(API + '/courses/active', headers={'Authorization': 'Bearer ' + jeton})
    with urllib.request.urlopen(req, timeout=10) as r:
        if r.status == 200:
            ancienne = json.loads(r.read().decode())
            appel('POST', f"/courses/{ancienne['id']}/annuler", {'motif': 'Nouvel essai'}, jeton)
            print(f"Course {ancienne['id']} précédente annulée.")
except Exception:
    pass

depart = {'lat': LAT + 0.002, 'lng': LNG + 0.001, 'adresse': 'Avenue Kennedy, Yaoundé'}
course = appel('POST', '/courses', {
    'depart': depart, 'arrivee': DESTINATION, 'typeService': 'DEPOT', 'nbPlaces': 1, 'modePaiement': 'ESPECES'
}, jeton)
cid = course['id']
print(f"Course {cid} demandée ({course['prixPropose']} FCFA). Répondez dans l’application chauffeur…")

offre = None
while not offre:
    offres = appel('GET', f'/courses/{cid}/offres', jeton=jeton) or []
    if offres:
        offre = offres[0]
        break
    if appel('GET', f'/courses/{cid}', jeton=jeton)['statut'] in ('ANNULEE', 'EXPIREE'):
        sys.exit('Course expirée sans réponse.')
    time.sleep(2)
print(f"Offre reçue : {offre['type']} à {offre['prix']} FCFA. Elle est choisie dans 3 s.")
time.sleep(3)
c = appel('POST', f"/courses/{cid}/offres/{offre['id']}/choisir", jeton=jeton)
print(f"CODE DE VÉRIFICATION À SAISIR : {c['codeVerification']}")

dernier = None
while True:
    statut = appel('GET', f'/courses/{cid}', jeton=jeton)['statut']
    if statut != dernier:
        print('Statut :', statut)
        dernier = statut
    if statut in ('TERMINEE', 'ANNULEE'):
        break
    time.sleep(2)
