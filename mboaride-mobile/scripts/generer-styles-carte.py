"""
Génère les styles de carte MboaRide (jour / nuit) à partir des styles libres OpenFreeMap.
Tuiles vectorielles OpenStreetMap gratuites, sans clé ni quota.
Usage : python3 scripts/generer-styles-carte.py   (depuis mboaride-mobile, connexion internet requise)
"""
import json
import subprocess

BASE = 'https://tiles.openfreemap.org/styles/'
SORTIE = 'src/carte/styles/'

# Palette du logo : marine #032E5D, orange #F78B03, vert #047030
JOUR = {
    'background': {'background-color': '#F4F6F9'},
    'park': {'fill-color': '#DCEFE2'},
    'landcover_wood': {'fill-color': '#D3EADB'},
    'water': {'fill-color': '#C9DDF2'},
    'waterway': {'line-color': '#B7D0EA'},
    'landuse_residential': {'fill-color': '#EEF1F5'},
    'building': {'fill-color': '#E6EAF0', 'fill-outline-color': '#D8DEE7'},
    'highway_minor': {'line-color': '#FFFFFF'},
    'highway_path': {'line-color': '#E9EDF2'},
    'highway_major_casing': {'line-color': '#D5DCE6'},
    'highway_major_inner': {'line-color': '#FFFFFF'},
    'highway_major_subtle': {'line-color': '#FFFFFF'},
    'highway_motorway_casing': {'line-color': '#F5C27A'},
    'highway_motorway_inner': {'line-color': '#FFE6C2'},
    'highway_motorway_subtle': {'line-color': '#FFE6C2'},
    'highway_motorway_bridge_casing': {'line-color': '#F5C27A'},
    'highway_motorway_bridge_inner': {'line-color': '#FFE6C2'},
    'highway-name-minor': {'text-color': '#5B6B80'},
    'highway-name-major': {'text-color': '#3E4F66'},
    'label_other': {'text-color': '#4B5D75'},
    'label_village': {'text-color': '#032E5D'},
    'label_town': {'text-color': '#032E5D'},
    'label_city': {'text-color': '#032E5D'},
    'label_city_capital': {'text-color': '#032E5D'},
    'water_name_point_label': {'text-color': '#3C6EA8'},
    'water_name_line_label': {'text-color': '#3C6EA8'},
}

NUIT = {
    'background': {'background-color': '#0A1A2F'},
    'water': {'fill-color': '#06213E'},
    'waterway': {'line-color': '#06213E'},
    'landuse_residential': {'fill-color': '#0D2038'},
    'landcover_wood': {'fill-color': '#0E2A2A'},
    'landuse_park': {'fill-color': '#0E2A2A'},
    'building': {'fill-color': '#10243F', 'fill-outline-color': '#162E4E'},
    'highway_path': {'line-color': '#15304F'},
    'highway_minor': {'line-color': '#1A3658'},
    'highway_major_casing': {'line-color': '#24456D'},
    'highway_major_inner': {'line-color': '#1E3D62'},
    'highway_major_subtle': {'line-color': '#1E3D62'},
    'highway_motorway_casing': {'line-color': '#7A4A0C'},
    'highway_motorway_inner': {'line-color': '#4A3415'},
    'highway_motorway_subtle': {'line-color': '#4A3415'},
    'highway_name_other': {'text-color': '#8AA1BF', 'text-halo-color': '#0A1A2F'},
    'highway_name_motorway': {'text-color': '#C9A06A'},
}
for couche in ['place_other', 'place_suburb', 'place_village', 'place_town', 'place_city', 'place_city_large']:
    NUIT[couche] = {'text-color': '#AFC2DA', 'text-halo-color': 'rgba(10,26,47,0.85)'}


def generer(base, couleurs, nom):
    # curl utilise les certificats du système (évite les erreurs SSL de certaines installations Python)
    style = json.loads(subprocess.check_output(['curl', '-sfL', '--max-time', '30', BASE + base]))
    style['name'] = 'MboaRide ' + nom
    for couche in style['layers']:
        couche.setdefault('paint', {}).update(couleurs.get(couche['id'], {}))
    with open(SORTIE + nom + '.json', 'w') as f:
        json.dump(style, f, separators=(',', ':'))
    print(nom, len(style['layers']), 'couches')


generer('positron', JOUR, 'jour')
generer('dark', NUIT, 'nuit')
