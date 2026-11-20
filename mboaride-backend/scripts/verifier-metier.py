"""
Vérification de la logique métier et de la cartographie de MboaRide, avant une mise en situation réelle.

Le script joue 2 clients, 2 taxis et 1 moto-taxi à Yaoundé, et contrôle chaque règle avec la valeur attendue
calculée à la main à partir des tarifs : prix de référence, fourchette de négociation, rayon de recherche,
compatibilité des services, Mboa Lady, ramassage dans la même direction, offres et contre-propositions,
code de vérification, commission, portefeuille, notation, annulation, relance au prix de référence.

Usage : python3 -I scripts/verifier-metier.py [URL_API] [--relance]
  URL_API   http://localhost:8080/api (défaut) ou https://mboaride-api.onrender.com/api
  --relance attend la fin du délai d'offres (≈ 70 s) pour vérifier la relance automatique
Le backend doit être en mode SMS simulé. Les chauffeurs de démo sont remis hors ligne à la fin.
"""
import json
import math
import sys
import time
import urllib.error
import urllib.request

sys.stdout.reconfigure(line_buffering=True)
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
API = ARGS[0] if ARGS else 'http://localhost:8080/api'
RELANCE = '--relance' in sys.argv

# Tarifs et paramètres de la base (V1__schema_mboa_ride.sql), modifiables dans le back-office
TARIFS = {'DEPOT': (500, 250, 25, 1500), 'MOTO': (150, 100, 10, 300)}   # prise en charge, /km, /min, minimum
PLACE_RAMASSAGE, KM_INCLUS, SUPPLEMENT_KM = 350, 6, 50
ALPHA, BETA, COMMISSION_PCT, RAYON_KM = 0.15, 0.30, 15, 5

# Lieux réels de Yaoundé
POSTE_CENTRALE = (3.8667, 11.5167)
MARCHE_MOKOLO = (3.8770, 11.5010)
EMANA = (3.9150, 11.5210)
ESSOS = (3.8740, 11.5350)
MVAN = (3.8247, 11.5194)

resultats = {'ok': 0, 'ko': 0, 'info': 0}


def verifier(condition, libelle, detail=''):
    resultats['ok' if condition else 'ko'] += 1
    print(f"  {'✔' if condition else '✘'} {libelle}" + (f'  [{detail}]' if detail else ''))
    return condition


def info(texte):
    resultats['info'] += 1
    print(f'  ℹ {texte}')


def appel(methode, chemin, corps=None, jeton=None, attendu_erreur=False):
    req = urllib.request.Request(API + chemin, method=methode, data=json.dumps(corps).encode() if corps is not None else None)
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept-Language', 'fr')
    if jeton:
        req.add_header('Authorization', 'Bearer ' + jeton)
    for essai in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                texte = r.read().decode()
                return r.status, (json.loads(texte) if texte else None)
        except urllib.error.HTTPError as e:
            texte = e.read().decode()
            try:
                return e.code, json.loads(texte)
            except ValueError:
                return e.code, {'message': texte[:200]}
        except (urllib.error.URLError, TimeoutError) as e:
            if essai == 3:
                raise
            time.sleep(5 * (essai + 1))


def ok(methode, chemin, corps=None, jeton=None):
    code, data = appel(methode, chemin, corps, jeton)
    if code >= 400:
        raise RuntimeError(f'{methode} {chemin} → {code} {data}')
    return data


def connecter(tel):
    code_otp = ok('POST', '/auth/otp/demander', {'telephone': tel})['codeDev']
    r = ok('POST', '/auth/otp/verifier', {'telephone': tel, 'code': code_otp})
    return r['token'], r['utilisateur']


def point(base, nord_km=0.0, est_km=0.0):
    return (base[0] + nord_km / 111.32, base[1] + est_km / (111.32 * math.cos(math.radians(base[0]))))


def distance_km(a, b):
    r = 6371
    dlat, dlng = math.radians(b[0] - a[0]), math.radians(b[1] - a[1])
    h = math.sin(dlat / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlng / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def pt(p, adresse):
    return {'lat': p[0], 'lng': p[1], 'adresse': adresse}


def arrondi(v, pas):
    return int(math.floor(v / pas + 0.5)) * pas


def prix_attendu(service, distance, duree, majorations_pct):
    pec, km, minute, minimum = TARIFS[service]
    base = (pec + distance * km + duree * minute) * (1 + majorations_pct / 100)
    ref = arrondi(max(base, minimum), 50)
    return ref, max(50, arrondi(ref * (1 - ALPHA), 50)), arrondi(ref * (1 + BETA), 50)


def en_ligne(jeton, position, actif=True):
    return ok('PUT', '/chauffeur/disponibilite', {'disponible': actif, 'lat': position[0], 'lng': position[1]}, jeton)


def placer(jeton, position):
    ok('POST', '/chauffeur/position', {'lat': position[0], 'lng': position[1]}, jeton)


def demandes(jeton):
    return {d['courseId']: d for d in ok('GET', '/chauffeur/demandes', jeton=jeton)}


def solde(jeton):
    return ok('GET', '/portefeuille', jeton=jeton)['solde']


def annuler_active(jeton):
    code, c = appel('GET', '/courses/active', jeton=jeton)
    if code == 200 and c:
        appel('POST', f"/courses/{c['id']}/annuler", {'motif': 'Nettoyage avant vérification'}, jeton)


def main():
    print(f'Vérification MboaRide sur {API}\n')

    # ------------------------------------------------------------------ comptes
    print('1. Connexion des comptes de démonstration')
    cli_a, u_a = connecter('690000001')
    cli_b, u_b = connecter('690000002')
    jean, u_jean = connecter('691000001')
    brigitte, u_bri = connecter('691000002')
    samuel, u_sam = connecter('691000003')
    verifier(u_jean['role'] == 'CHAUFFEUR' and u_sam['role'] == 'CHAUFFEUR', 'les 3 chauffeurs sont bien des comptes chauffeurs')
    for j in (cli_a, cli_b):
        annuler_active(j)
    for j in (jean, brigitte, samuel):
        for c in ok('GET', '/chauffeur/courses/actives', jeton=j):
            appel('POST', f"/chauffeur/courses/{c['id']}/annuler", {'motif': 'Nettoyage'}, j)
        ok('PUT', '/chauffeur/ramassage', {'actif': False}, j) if j is not samuel else None
    for nom, j in (('Jean', jean), ('Brigitte', brigitte), ('Samuel', samuel)):
        s = solde(j)
        if s < -5000:
            info(f'{nom} a un solde de {s} FCFA, sous le minimum de -5 000 FCFA : il ne pourra pas passer en ligne')

    # ------------------------------------------------------------------ cartographie
    print('\n2. Cartographie : itinéraire routier et véhicules proches')
    q = f'?deLat={POSTE_CENTRALE[0]}&deLng={POSTE_CENTRALE[1]}&versLat={MARCHE_MOKOLO[0]}&versLng={MARCHE_MOKOLO[1]}'
    it = ok('GET', '/carte/itineraire' + q, jeton=cli_a)
    vol = distance_km(POSTE_CENTRALE, MARCHE_MOKOLO)
    verifier(not it.get('estime'), 'itinéraire calculé sur le vrai réseau routier (OSRM), pas une estimation',
             'estimation à vol d\'oiseau utilisée' if it.get('estime') else f"{len(it['trace'])} points")
    verifier(vol <= it['distanceKm'] <= vol * 2.5, 'distance routière cohérente avec la distance à vol d\'oiseau',
             f"route {it['distanceKm']} km / vol d'oiseau {vol:.2f} km")
    verifier(2 <= it['dureeMin'] <= 30, 'durée de trajet plausible en ville', f"{it['dureeMin']} min")
    tr = it['trace']
    verifier(distance_km(tuple(tr[0]), POSTE_CENTRALE) < 0.3 and distance_km(tuple(tr[-1]), MARCHE_MOKOLO) < 0.3,
             'le tracé part du départ et arrive à la destination')

    pos_jean = point(POSTE_CENTRALE, 0.9)          # 900 m au nord du client
    pos_bri = point(POSTE_CENTRALE, -8.0)          # 8 km au sud : hors du rayon de 5 km
    pos_sam = point(POSTE_CENTRALE, 0.4, 0.2)      # moto à 450 m
    en_ligne(jean, pos_jean)
    en_ligne(brigitte, pos_bri)
    en_ligne(samuel, pos_sam)
    placer(jean, pos_jean)
    placer(brigitte, pos_bri)
    placer(samuel, pos_sam)
    proches = ok('GET', f'/carte/vehicules-proches?lat={POSTE_CENTRALE[0]}&lng={POSTE_CENTRALE[1]}', jeton=cli_a)
    ids = {str(v['id']) for v in proches}
    verifier(len(proches) >= 2, 'les véhicules à moins de 3 km apparaissent sur la carte du client', f'{len(proches)} véhicule(s)')
    verifier(not ids & {str(u_jean['id']), str(u_sam['id'])}, 'identifiants anonymisés (pas l\'id des chauffeurs)')
    if proches:
        ecart = min(distance_km((v['lat'], v['lng']), pos_jean) for v in proches) * 1000
        verifier(20 <= ecart <= 200, 'position affichée décalée pour protéger le chauffeur', f'{ecart:.0f} m de la vraie position')
    verifier(all(distance_km((v['lat'], v['lng']), POSTE_CENTRALE) <= 3.3 for v in proches),
             'aucun véhicule au-delà de 3 km (Brigitte, à 8 km, n\'apparaît pas)')

    # ------------------------------------------------------------------ prix
    print('\n3. Calcul des prix (taxi dépôt, moto, ramassage)')
    est = ok('POST', '/courses/estimation', {'depart': pt(POSTE_CENTRALE, 'Poste Centrale'), 'arrivee': pt(ESSOS, 'Carrefour Essos'),
                                              'nbPlaces': 1}, cli_a)
    services = {s['typeService']: s for s in est['services']}
    depot = services['DEPOT']
    maj = sum(m['pct'] for m in depot['majorations'])
    ref, pmin, pmax = prix_attendu('DEPOT', est['distanceKm'], est['dureeMin'], maj)
    detail = f"{est['distanceKm']} km, {est['dureeMin']} min, majorations {maj:g} % → attendu {ref}, API {depot['prixReference']}"
    verifier(abs(depot['prixReference'] - ref) <= 50, 'prix de référence taxi = (500 + 250×km + 25×min) × majorations, arrondi à 50', detail)
    verifier(depot['prixReference'] % 50 == 0, 'prix arrondi au multiple de 50 FCFA')
    verifier(abs(depot['prixMin'] - pmin) <= 50 and abs(depot['prixMax'] - pmax) <= 50,
             'fourchette de négociation = [réf × 0,85 ; réf × 1,30]', f"[{depot['prixMin']} ; {depot['prixMax']}]")
    if depot['majorations']:
        info('majorations actives : ' + ', '.join(f"{m['libelle']} +{m['pct']:g} %" for m in depot['majorations']))

    court = ok('POST', '/courses/estimation', {'depart': pt(POSTE_CENTRALE, 'A'), 'arrivee': pt(point(POSTE_CENTRALE, 0.35), 'B'),
                                                'nbPlaces': 1}, cli_a)
    verifier({s['typeService']: s for s in court['services']}['DEPOT']['prixReference'] >= 1500,
             'une course très courte paie au moins le minimum de 1 500 FCFA')

    ram = services['RAMASSAGE']
    attendu_place = arrondi(PLACE_RAMASSAGE + max(0, est['distanceKm'] - KM_INCLUS) * SUPPLEMENT_KM, 25)
    verifier(ram['prixParPlace'] == attendu_place, 'ramassage : 350 FCFA la place jusqu\'à 6 km, +50 FCFA/km au-delà',
             f"{ram['prixParPlace']} FCFA")
    est3 = ok('POST', '/courses/estimation', {'depart': pt(POSTE_CENTRALE, 'A'), 'arrivee': pt(ESSOS, 'B'), 'nbPlaces': 3}, cli_a)
    ram3 = {s['typeService']: s for s in est3['services']}['RAMASSAGE']
    verifier(ram3['prixReference'] == 3 * ram3['prixParPlace'], 'ramassage : 3 places = 3 × prix d\'une place', f"{ram3['prixReference']} FCFA")
    verifier(not ram['negociable'], 'ramassage : prix officiel non négociable')

    moto = services['MOTO']
    if moto['disponible']:
        majm = sum(m['pct'] for m in moto['majorations'])
        refm, _, _ = prix_attendu('MOTO', est['distanceKm'], est['dureeMin'] * 0.8, majm)
        verifier(abs(moto['prixReference'] - refm) <= 50, 'moto : (150 + 100×km + 10×min×0,8), moins chère que le taxi',
                 f"moto {moto['prixReference']} / taxi {depot['prixReference']}")
    else:
        info(f"moto indisponible au centre-ville ({moto['motifIndisponible']}) : règle de zone appliquée")

    # ------------------------------------------------------------------ dispatch + négociation
    print('\n4. Commande taxi : rayon, compatibilité, offres et négociation')
    depart, arrivee = pt(POSTE_CENTRALE, 'Poste Centrale'), pt(ESSOS, 'Carrefour Essos')
    code, err = appel('POST', '/courses', {'depart': depart, 'arrivee': arrivee, 'typeService': 'DEPOT', 'nbPlaces': 1,
                                           'prixPropose': depot['prixMax'] + 100, 'modePaiement': 'ESPECES'}, cli_a)
    verifier(code == 400, 'prix proposé au-dessus de la fourchette refusé', err.get('message', '') if err else '')
    code, err = appel('POST', '/courses', {'depart': depart, 'arrivee': arrivee, 'typeService': 'DEPOT', 'nbPlaces': 1,
                                           'prixPropose': depot['prixMin'] - 100, 'modePaiement': 'ESPECES'}, cli_a)
    verifier(code == 400, 'prix proposé au-dessous de la fourchette refusé')

    course = ok('POST', '/courses', {'depart': depart, 'arrivee': arrivee, 'typeService': 'DEPOT', 'nbPlaces': 1,
                                     'prixPropose': depot['prixMin'], 'modePaiement': 'ESPECES'}, cli_a)
    cid = course['id']
    verifier(course['statut'] == 'RECHERCHE', 'course créée en recherche de chauffeur', course['reference'])
    code, _ = appel('POST', '/courses', {'depart': depart, 'arrivee': arrivee, 'typeService': 'DEPOT', 'nbPlaces': 1,
                                         'modePaiement': 'ESPECES'}, cli_a)
    verifier(code == 409, 'un client ne peut pas avoir deux courses en cours')

    time.sleep(1)
    verifier(cid in demandes(jean), 'Jean (taxi, 900 m) reçoit la demande')
    verifier(cid not in demandes(brigitte), 'Brigitte (taxi, 8 km) ne la reçoit pas : hors du rayon de 5 km')
    verifier(cid not in demandes(samuel), 'Samuel (moto) ne reçoit pas une demande de taxi')
    pos_bri = point(POSTE_CENTRALE, -2.0)
    placer(brigitte, pos_bri)
    d_bri = demandes(brigitte).get(cid)
    verifier(d_bri is not None, 'Brigitte se rapproche à 2 km : elle reçoit la demande')
    if d_bri:
        verifier(abs(d_bri['distancePriseEnChargeKm'] - 2.0) < 0.3, 'distance de prise en charge affichée au chauffeur',
                 f"{d_bri['distancePriseEnChargeKm']} km")

    code, _ = appel('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'CONTRE_PROPOSITION', 'prix': depot['prixMax'] + 500}, jean)
    verifier(code == 400, 'contre-proposition hors fourchette refusée')
    contre = min(depot['prixMax'], course['prixPropose'] + 200)
    o_jean = ok('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'CONTRE_PROPOSITION', 'prix': contre}, jean)
    verifier(o_jean['prix'] == contre, 'Jean fait une contre-proposition', f'{contre} FCFA')
    code, _ = appel('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'ACCEPTATION'}, jean)
    verifier(code == 409, 'une seule réponse par chauffeur et par tour de négociation')
    o_bri = ok('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'ACCEPTATION'}, brigitte)
    verifier(o_bri['prix'] == course['prixPropose'], 'Brigitte accepte au prix du client', f"{o_bri['prix']} FCFA")
    offres = ok('GET', f'/courses/{cid}/offres', jeton=cli_a)
    verifier(len(offres) == 2, 'le client voit les 2 offres')

    if RELANCE:
        print('   … attente de la fin du délai d\'offres (relance automatique)')
        c_avant = ok('GET', f'/courses/{cid}', jeton=cli_a)
        fin = time.time() + 150
        while time.time() < fin:
            time.sleep(10)
            c_apres = ok('GET', f'/courses/{cid}', jeton=cli_a)
            if c_apres['tourNegociation'] > c_avant['tourNegociation']:
                break
        verifier(c_apres['tourNegociation'] == c_avant['tourNegociation'] + 1, 'sans choix du client, la demande est relancée')
        verifier(c_apres['prixPropose'] == c_apres['prixReference'], 'la relance se fait au prix de référence',
                 f"{c_apres['prixPropose']} FCFA")
        o_bri = ok('POST', f'/chauffeur/demandes/{cid}/repondre', {'type': 'ACCEPTATION'}, brigitte)
        offres = ok('GET', f'/courses/{cid}/offres', jeton=cli_a)

    c = ok('POST', f"/courses/{cid}/offres/{o_bri['id']}/choisir", jeton=cli_a)
    verifier(c['statut'] == 'ACCEPTEE' and c['chauffeur']['id'] == u_bri['id'], 'le client choisit Brigitte : course acceptée')
    verifier(c['prixFinal'] == o_bri['prix'], 'prix final = prix de l\'offre choisie', f"{c['prixFinal']} FCFA")
    verifier(cid not in demandes(jean), 'la demande disparaît chez Jean')
    verifier(len(c.get('codeVerification') or '') == 4, 'le client reçoit un code de vérification à 4 chiffres')

    # ------------------------------------------------------------------ déroulement
    print('\n5. Déroulement : arrivée, code, trajet, fin, commission')
    solde_bri_avant = solde(brigitte)
    ok('POST', f'/chauffeur/courses/{cid}/arrivee', jeton=brigitte)
    faux = '0000' if c['codeVerification'] != '0000' else '1111'
    code, _ = appel('POST', f'/chauffeur/courses/{cid}/demarrer', {'code': faux}, brigitte)
    verifier(code == 400, 'un mauvais code empêche de démarrer la course')
    code, _ = appel('POST', f'/chauffeur/courses/{cid}/demarrer', {'code': c['codeVerification']}, jean)
    verifier(code in (403, 404, 400), 'un autre chauffeur ne peut pas démarrer la course')
    c = ok('POST', f'/chauffeur/courses/{cid}/demarrer', {'code': c['codeVerification']}, brigitte)
    verifier(c['statut'] == 'EN_COURS', 'le bon code démarre la course')
    placer(brigitte, (ESSOS[0], ESSOS[1]))
    c = ok('POST', f'/chauffeur/courses/{cid}/terminer', jeton=brigitte)
    com_attendue = arrondi(c['prixFinal'] * COMMISSION_PCT / 100, 25)
    verifier(c['statut'] == 'TERMINEE', 'course terminée')
    verifier(c['commission'] == com_attendue, 'commission = 15 % du prix, arrondie à 25 FCFA', f"{c['commission']} FCFA")
    verifier(c['gainChauffeur'] == c['prixFinal'] - c['commission'], 'gain du chauffeur = prix − commission', f"{c['gainChauffeur']} FCFA")
    verifier(c['statutPaiement'] == 'PAYE', 'espèces : course marquée payée')
    verifier(solde(brigitte) == solde_bri_avant - c['commission'],
             'espèces : la commission est prélevée sur le portefeuille du chauffeur', f"{solde_bri_avant} → {solde(brigitte)}")

    code, _ = appel('POST', f'/courses/{cid}/noter', {'note': 9}, cli_a)
    verifier(code == 400, 'une note de 9/5 est refusée')
    code, _ = appel('POST', f'/courses/{cid}/noter', {'note': 5, 'commentaire': 'Vérification automatique'}, cli_a)
    verifier(code < 300, 'le client note la chauffeuse 5/5')
    code, _ = appel('POST', f'/courses/{cid}/noter', {'note': 4}, cli_a)
    verifier(code == 409 or code == 400, 'on ne peut noter qu\'une fois')
    code, _ = appel('POST', f'/courses/{cid}/noter', {'note': 5}, brigitte)
    verifier(code < 300, 'la chauffeuse note le client')

    # ------------------------------------------------------------------ Mboa Lady
    print('\n6. Mboa Lady (chauffeuse uniquement)')
    if u_b.get('genre') == 'F':
        c2 = ok('POST', '/courses', {'depart': depart, 'arrivee': pt(MARCHE_MOKOLO, 'Marché Mokolo'), 'typeService': 'DEPOT',
                                     'nbPlaces': 1, 'modePaiement': 'ESPECES', 'mboaLady': True}, cli_b)
        placer(jean, pos_jean)
        placer(brigitte, point(POSTE_CENTRALE, 0.5))
        time.sleep(1)
        verifier(c2['id'] not in demandes(jean), 'Jean (homme) ne reçoit pas une demande Mboa Lady')
        verifier(c2['id'] in demandes(brigitte), 'Brigitte (femme) la reçoit')
        c2 = ok('POST', f"/courses/{c2['id']}/annuler", {'motif': 'Vérification'}, cli_b)
        verifier(c2['statut'] == 'ANNULEE' and c2['fraisAnnulation'] == 0, 'annulation pendant la recherche : gratuite')
    else:
        info('la cliente 690000002 n\'a pas le genre F : test Mboa Lady ignoré')

    # ------------------------------------------------------------------ ramassage
    print('\n7. Taxi ramassage : même direction et places libres')
    ok('PUT', '/chauffeur/ramassage', {'actif': True, 'placesLibres': 3, 'directionLibelle': 'Emana',
                                       'directionLat': EMANA[0], 'directionLng': EMANA[1]}, jean)
    placer(jean, point(POSTE_CENTRALE, 0.3))
    vers_nord = ok('POST', '/courses', {'depart': depart, 'arrivee': pt(point(EMANA, -0.5), 'Vers Emana'), 'typeService': 'RAMASSAGE',
                                        'nbPlaces': 2, 'modePaiement': 'ESPECES'}, cli_b)
    time.sleep(1)
    verifier(vers_nord['id'] in demandes(jean), 'Jean (direction Emana, 3 places) reçoit un client qui va vers le nord')
    code, _ = appel('POST', f"/chauffeur/demandes/{vers_nord['id']}/repondre", {'type': 'CONTRE_PROPOSITION', 'prix': 2000}, jean)
    verifier(code == 400, 'ramassage : pas de contre-proposition (prix officiel)')
    ok('POST', f"/courses/{vers_nord['id']}/annuler", {'motif': 'Vérification'}, cli_b)
    vers_sud = ok('POST', '/courses', {'depart': depart, 'arrivee': pt(MVAN, 'Carrefour Mvan'), 'typeService': 'RAMASSAGE',
                                       'nbPlaces': 1, 'modePaiement': 'ESPECES'}, cli_b)
    time.sleep(1)
    verifier(vers_sud['id'] not in demandes(jean), 'un client qui va vers le sud (Mvan) n\'est pas proposé à Jean')
    ok('POST', f"/courses/{vers_sud['id']}/annuler", {'motif': 'Vérification'}, cli_b)
    vers_nord4 = ok('POST', '/courses', {'depart': depart, 'arrivee': pt(point(EMANA, -0.5), 'Vers Emana'), 'typeService': 'RAMASSAGE',
                                         'nbPlaces': 4, 'modePaiement': 'ESPECES'}, cli_b)
    time.sleep(1)
    verifier(vers_nord4['id'] not in demandes(jean), '4 places demandées pour 3 libres : pas proposé')
    ok('POST', f"/courses/{vers_nord4['id']}/annuler", {'motif': 'Vérification'}, cli_b)
    ok('PUT', '/chauffeur/ramassage', {'actif': False}, jean)

    # ------------------------------------------------------------------ moto
    print('\n8. Moto-taxi : zone, passager unique, casque')
    dep_moto = pt(point(EMANA, 0, 0.3), 'Carrefour Emana')
    placer(samuel, point(EMANA, 0.4))
    code, _ = appel('POST', '/courses', {'depart': dep_moto, 'arrivee': pt(point(EMANA, 2.0), 'Nord'), 'typeService': 'MOTO',
                                         'nbPlaces': 2, 'modePaiement': 'ESPECES'}, cli_a)
    verifier(code == 400, 'moto : un seul passager')
    code, m = appel('POST', '/courses', {'depart': dep_moto, 'arrivee': pt(point(EMANA, 2.0), 'Nord'), 'typeService': 'MOTO',
                                         'nbPlaces': 1, 'modePaiement': 'ESPECES'}, cli_a)
    if code == 400:
        info(f"moto refusée à cette heure ou dans cette zone : {m.get('message')}")
    else:
        time.sleep(1)
        verifier(m['id'] in demandes(samuel), 'Samuel (moto, 400 m) reçoit la demande de moto')
        verifier(m['id'] not in demandes(jean), 'un taxi ne reçoit pas une demande de moto')
        code, _ = appel('POST', f"/chauffeur/demandes/{m['id']}/repondre", {'type': 'ACCEPTATION'}, samuel)
        verifier(code == 400, 'moto : le chauffeur doit confirmer avoir un casque pour le passager')
        code, _ = appel('POST', f"/chauffeur/demandes/{m['id']}/repondre", {'type': 'ACCEPTATION', 'casqueConfirme': True}, samuel)
        verifier(code < 300, 'avec casque confirmé, l\'offre est acceptée')
        ok('POST', f"/courses/{m['id']}/annuler", {'motif': 'Vérification'}, cli_a)

    # ------------------------------------------------------------------ portefeuille
    print('\n9. Paiement par portefeuille')
    s_cli = solde(cli_a)
    code, err = appel('POST', '/courses', {'depart': depart, 'arrivee': arrivee, 'typeService': 'DEPOT', 'nbPlaces': 1,
                                           'modePaiement': 'PORTEFEUILLE'}, cli_a)
    if s_cli < depot['prixReference']:
        verifier(code == 400, 'portefeuille insuffisant : commande refusée', f'solde {s_cli} FCFA')
    elif code < 300:
        cw = err
        placer(jean, pos_jean)
        time.sleep(1)
        o = ok('POST', f"/chauffeur/demandes/{cw['id']}/repondre", {'type': 'ACCEPTATION'}, jean)
        cw = ok('POST', f"/courses/{cw['id']}/offres/{o['id']}/choisir", jeton=cli_a)
        s_jean = solde(jean)
        ok('POST', f"/chauffeur/courses/{cw['id']}/arrivee", jeton=jean)
        ok('POST', f"/chauffeur/courses/{cw['id']}/demarrer", {'code': cw['codeVerification']}, jean)
        cw = ok('POST', f"/chauffeur/courses/{cw['id']}/terminer", jeton=jean)
        verifier(solde(cli_a) == s_cli - cw['montantAPayer'], 'le client est débité du montant de la course',
                 f"{s_cli} → {solde(cli_a)}")
        verifier(solde(jean) == s_jean + cw['gainChauffeur'], 'le chauffeur est crédité de son gain', f"+{cw['gainChauffeur']} FCFA")
    else:
        verifier(False, 'commande payée par portefeuille', str(err))

    # ------------------------------------------------------------------ nettoyage
    for j in (jean, brigitte, samuel):
        appel('PUT', '/chauffeur/disponibilite', {'disponible': False}, j)
    print(f"\nRésultat : {resultats['ok']} contrôles réussis, {resultats['ko']} en échec, {resultats['info']} information(s).")
    sys.exit(1 if resultats['ko'] else 0)


main()
