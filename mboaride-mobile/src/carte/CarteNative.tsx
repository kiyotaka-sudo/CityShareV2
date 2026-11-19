import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraRef, GeoJSONSource, Images, Layer, Map, Marker, type StyleSpecification } from '@maplibre/maplibre-react-native';
import styleJour from './styles/jour.json';
import styleNuit from './styles/nuit.json';
import { couleurs } from '../theme';
import { couperTrace } from './geo';
import { AUCUN_POINT, AUCUN_VEHICULE, CarteProps, estNuit } from './types';
import { useVehiculesAnimes } from './useVehiculesAnimes';
import { useTraceProgressive } from './useTraceProgressive';
import RadarRecherche from '../components/course/RadarRecherche';

const IMAGES = {
  'vehicule-TAXI': require('../../assets/images/vehicule-taxi.png'),
  'vehicule-RAMASSAGE': require('../../assets/images/vehicule-taxi-ramassage.png'),
  'vehicule-MOTO': require('../../assets/images/vehicule-moto.png')
};

const ligne = (coords: { lat: number; lng: number }[]): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.map((c) => [c.lng, c.lat]) }
});

/**
 * Carte vectorielle native (MapLibre + tuiles OpenFreeMap) : rendu GPU à 60 images/s,
 * styles jour/nuit aux couleurs MboaRide, véhicules animés en couche native.
 */
export default function CarteNative({
  vehicules = AUCUN_VEHICULE, points = AUCUN_POINT, trace: traceComplete, zonesChaudes, centre, zoom = 14, ajuster = true, suivre,
  aimanterSurTrace, animerTrace, nuit = 'auto', marges, radar, onPress
}: CarteProps) {
  const traceVisible = useTraceProgressive(traceComplete, !!animerTrace);
  const trace = traceComplete;
  const camera = useRef<CameraRef>(null);
  const interaction = useRef(0);
  const sombre = estNuit(nuit);
  const affiches = useVehiculesAnimes(vehicules, trace, aimanterSurTrace ? suivre : undefined);
  const padding = { top: marges?.haut ?? 80, bottom: marges?.bas ?? 80, left: marges?.gauche ?? 50, right: marges?.droite ?? 50 };

  const vehiculeSuivi = affiches.find((v) => v.id === suivre);

  // Itinéraire : partie parcourue grisée derrière le véhicule suivi
  const lignes = useMemo(() => {
    if (!traceVisible || traceVisible.length < 2) return null;
    if (vehiculeSuivi && aimanterSurTrace && trace) return couperTrace(trace, vehiculeSuivi);
    return { parcouru: [], restant: traceVisible };
  }, [traceVisible, trace, aimanterSurTrace, vehiculeSuivi && Math.round(vehiculeSuivi.lat * 20000), vehiculeSuivi && Math.round(vehiculeSuivi.lng * 20000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const vehiculesGeo = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: affiches.map((v) => ({
      type: 'Feature', id: v.id, properties: { icone: `vehicule-${v.type}`, cap: v.cap },
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] }
    }))
  }), [affiches]);

  const pointsGeo = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: points.map((p) => ({ type: 'Feature', id: p.id, properties: { type: p.type }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }))
  }), [points]);

  // Zones de forte demande qui « respirent » : MapLibre anime lui-même la transition entre deux intensités
  const aZones = !!zonesChaudes && zonesChaudes.length > 0;
  const [pouls, setPouls] = useState(false);
  useEffect(() => {
    if (!aZones) return undefined;
    const id = setInterval(() => setPouls((p) => !p), 1400);
    return () => clearInterval(id);
  }, [aZones]);

  const zonesGeo = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: (zonesChaudes ?? []).map((z, i) => ({ type: 'Feature', id: i, properties: { intensite: z.intensite }, geometry: { type: 'Point', coordinates: [z.lng, z.lat] } }))
  }), [zonesChaudes]);

  // Recadrage doux sur le trajet et les points
  const cleCadre = JSON.stringify([points.map((p) => [p.lat.toFixed(4), p.lng.toFixed(4)]), trace?.length ?? 0]);
  useEffect(() => {
    if (!ajuster || suivre) return undefined;
    const coords = [...points, ...(trace ?? [])];
    const cadrer = () => {
      if (coords.length === 1) {
        camera.current?.easeTo({ center: [coords[0].lng, coords[0].lat], zoom: 15, duration: 800 });
      } else if (coords.length > 1) {
        const lngs = coords.map((c) => c.lng);
        const lats = coords.map((c) => c.lat);
        camera.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], { padding, duration: 900 });
      }
    };
    cadrer();
    // À l'ouverture de l'écran, la caméra native n'est pas encore prête : on recadre une seconde fois
    const id = setTimeout(cadrer, 700);
    return () => clearTimeout(id);
  }, [cleCadre, ajuster, suivre]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (centre && !ajuster) camera.current?.easeTo({ center: [centre.lng, centre.lat], duration: 800 });
  }, [centre?.lat, centre?.lng, ajuster]); // eslint-disable-line react-hooks/exhaustive-deps

  // Caméra qui suit le véhicule, en pause 8 s après un geste de l'utilisateur
  useEffect(() => {
    if (!suivre) return undefined;
    const id = setInterval(() => {
      const v = affichesRef.current.find((x) => x.id === suivre);
      if (v && Date.now() - interaction.current > 8000) {
        camera.current?.easeTo({ center: [v.lng, v.lat], zoom: 16, padding, duration: 1200 });
      }
    }, 1500);
    return () => clearInterval(id);
  }, [suivre]); // eslint-disable-line react-hooks/exhaustive-deps
  const affichesRef = useRef(affiches);
  affichesRef.current = affiches;

  const depart = centre ?? points[0] ?? { lat: 3.8667, lng: 11.5167 };

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={(sombre ? styleNuit : styleJour) as unknown as StyleSpecification}
      logo={false}
      compass={false}
      attribution
      attributionPosition={{ bottom: (marges?.bas ?? 0) + 8, left: 8 }}
      onPress={(e) => {
        const [lng, lat] = e.nativeEvent.lngLat;
        onPress?.({ lat, lng });
      }}
      onRegionWillChange={(e) => { if (e.nativeEvent.userInteraction) interaction.current = Date.now(); }}>
      <Camera ref={camera} initialViewState={{ center: [depart.lng, depart.lat], zoom }} />
      <Images images={IMAGES} />

      {/* Toutes les couches restent montées (vides au besoin) : MapLibre empile une couche ajoutée en cours de route
          au-dessus des autres, ce qui ferait passer l'itinéraire par-dessus les véhicules. */}
      <GeoJSONSource id="zones" data={zonesGeo}>
          <Layer id="zones-chaleur" type="heatmap" paint={{
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensite'], 0, 0, 10, 1],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, pouls ? 30 : 22, 16, pouls ? 72 : 54],
            'heatmap-radius-transition': { duration: 1300, delay: 0 },
            'heatmap-intensity': pouls ? 1.3 : 0.85,
            'heatmap-intensity-transition': { duration: 1300, delay: 0 },
            'heatmap-opacity': 0.75,
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(247,139,3,0)', 0.3, 'rgba(248,217,2,0.55)', 0.6, 'rgba(247,139,3,0.75)', 1, 'rgba(214,69,69,0.9)']
          }} />
      </GeoJSONSource>

      <GeoJSONSource id="trace" data={{ type: 'FeatureCollection', features: lignes && lignes.restant.length > 1 ? [ligne(lignes.restant)] : [] }}>
          <Layer id="trace-contour" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': sombre ? '#0A1A2F' : '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 17, 12] }} />
          <Layer id="trace-ligne" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': sombre ? couleurs.accent : couleurs.primaire, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 17, 7] }} />
      </GeoJSONSource>
      <GeoJSONSource id="trace-parcouru" data={{ type: 'FeatureCollection', features: lignes && lignes.parcouru.length > 1 ? [ligne(lignes.parcouru)] : [] }}>
          <Layer id="trace-parcouru-ligne" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#9CA3AF', 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 17, 6] }} />
      </GeoJSONSource>

      {radar && (
        <Marker id="radar" lngLat={[radar.lng, radar.lat]} anchor="center">
          <RadarRecherche />
        </Marker>
      )}

      <GeoJSONSource id="points" data={pointsGeo}>
        <Layer id="moi-halo" type="circle" filter={['==', ['get', 'type'], 'moi']}
          paint={{ 'circle-radius': 18, 'circle-color': couleurs.bleu, 'circle-opacity': 0.15 }} />
        <Layer id="points-cercles" type="circle" paint={{
          'circle-radius': ['match', ['get', 'type'], 'arrivee', 9, 'depart', 8, 7],
          'circle-color': ['match', ['get', 'type'], 'arrivee', couleurs.accent, 'depart', couleurs.primaire, couleurs.bleu],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFFFF'
        }} />
      </GeoJSONSource>

      <GeoJSONSource id="vehicules" data={vehiculesGeo}>
        <Layer id="vehicules-icones" type="symbol" layout={{
          'icon-image': ['get', 'icone'],
          'icon-rotate': ['get', 'cap'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.1, 14, 0.17, 17, 0.28, 19, 0.4]
        }} />
      </GeoJSONSource>
    </Map>
  );
}
