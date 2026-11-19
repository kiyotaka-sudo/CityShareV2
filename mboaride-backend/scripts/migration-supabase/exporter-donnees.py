"""
Exporte toutes les données de la base MySQL/MariaDB locale (mboa_ride) en SQL PostgreSQL.

Chaque ligne devient un INSERT ... ON CONFLICT DO NOTHING (rejouable sans doublon), dans l'ordre des clés
étrangères, puis les séquences des identifiants sont recalées sur le plus grand id copié.
Usage : python3 -I exporter-donnees.py SORTIE.sql [CLIENT_MYSQL]
"""
import json
import subprocess
import sys

SORTIE = sys.argv[1]
MYSQL = sys.argv[2] if len(sys.argv) > 2 else '/Applications/XAMPP/xamppfiles/bin/mysql'
BASE = 'mboa_ride'

# Ordre compatible avec les clés étrangères
ORDRE = [
    'utilisateur', 'contact_confiance', 'lieu_favori', 'vehicule', 'chauffeur', 'document_chauffeur', 'zone', 'tarif',
    'parametre', 'repere', 'code_promo', 'course', 'offre', 'course_ignoree', 'course_position', 'paiement',
    'transaction_portefeuille', 'retrait', 'notation', 'reclamation', 'alerte_sos', 'message', 'notification',
    'campagne_notification', 'utilisation_promo', 'otp_code', 'journal_admin'
]


def mysql(requete):
    return subprocess.run([MYSQL, '-u', 'root', '-N', '-B', '--raw', BASE, '-e', requete],
                          capture_output=True, text=True, check=True).stdout


def colonnes(table):
    lignes = mysql(f"SELECT column_name, data_type FROM information_schema.columns "
                   f"WHERE table_schema='{BASE}' AND table_name='{table}' ORDER BY ordinal_position").strip().split('\n')
    return [tuple(l.split('\t')) for l in lignes if l]


def litteral(valeur, type_sql):
    if valeur is None:
        return 'NULL'
    if type_sql == 'bit':
        return 'TRUE' if int(valeur) else 'FALSE'
    if isinstance(valeur, (int, float)):
        return repr(valeur)
    return "'" + str(valeur).replace("'", "''") + "'"


def main():
    sortie = ['-- Données copiées depuis MySQL/MariaDB (mboa_ride)']
    total = 0
    for table in ORDRE:
        cols = colonnes(table)
        # Les BIT sortent en octets bruts : on les convertit en entier côté MySQL
        champs = ', '.join(f"'{c}', {'CAST(`' + c + '` AS UNSIGNED)' if t == 'bit' else '`' + c + '`'}" for c, t in cols)
        lignes = [l for l in mysql(f'SELECT JSON_OBJECT({champs}) FROM `{table}`').split('\n') if l.strip()]
        noms = ', '.join(c for c, _ in cols)
        for l in lignes:
            obj = json.loads(l)
            valeurs = ', '.join(litteral(obj[c], t) for c, t in cols)
            sortie.append(f'INSERT INTO {table} ({noms}) VALUES ({valeurs}) ON CONFLICT DO NOTHING;')
        total += len(lignes)
        print(f'{table:28s} {len(lignes):4d}')
        if any(c == 'id' for c, _ in cols):
            sortie.append(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), "
                          f"(SELECT COUNT(*) > 0 FROM {table}));")
    open(SORTIE, 'w').write('\n'.join(sortie) + '\n')
    print(f'Total : {total} lignes -> {SORTIE}')


main()
