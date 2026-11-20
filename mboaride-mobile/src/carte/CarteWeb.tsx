import React, { useEffect, useMemo, useRef } from 'react';
import { Image } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { couleurs } from '../theme';
import { AUCUN_POINT, AUCUN_VEHICULE, CarteProps, estNuit } from './types';
import { useVehiculesAnimes } from './useVehiculesAnimes';

const icone = (m: number) => Image.resolveAssetSource(m).uri;
const ICONES = {
  TAXI: icone(require('../../assets/images/vehicule-taxi.png')),
  RAMASSAGE: icone(require('../../assets/images/vehicule-taxi-ramassage.png')),
  MOTO: icone(require('../../assets/images/vehicule-moto.png'))
};

/**
 * Carte de secours (Leaflet + OpenStreetMap dans une WebView), utilisée uniquement dans Expo Go
 * où le module natif MapLibre n'existe pas. Mêmes propriétés et mêmes animations que la carte native.
 */
export default function CarteWeb({
  vehicules = AUCUN_VEHICULE, points = AUCUN_POINT, trace, zonesChaudes, centre, zoom = 14, ajuster = true, suivre,
  aimanterSurTrace, nuit = 'auto', marges, radar, recentrage, onPress
}: CarteProps) {
  const ref = useRef<WebView>(null);
  const pret = useRef(false);
  const affiches = useVehiculesAnimes(vehicules, trace, aimanterSurTrace ? suivre : undefined);
  const html = useMemo(() => HTML(centre ?? points[0] ?? { lat: 3.8667, lng: 11.5167 }, zoom, estNuit(nuit)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const envoyer = (js: string) => pret.current && ref.current?.injectJavaScript(js + ';true;');

  const statique = JSON.stringify({
    points, radar: radar ?? null, trace: (trace ?? []).map((c) => [c.lat, c.lng]), zones: zonesChaudes ?? [], ajuster: ajuster && !suivre,
    marges: [marges?.haut ?? 60, marges?.droite ?? 40, marges?.bas ?? 60, marges?.gauche ?? 40]
  });
  useEffect(() => { envoyer(`window.statique(${statique})`); }, [statique]); // eslint-disable-line react-hooks/exhaustive-deps

  // Les positions interpolées sont transmises à ~10 images/s ; une transition CSS lisse le reste
  const derniereEmission = useRef(0);
  useEffect(() => {
    const t = Date.now();
    if (t - derniereEmission.current < 100) return;
    derniereEmission.current = t;
    envoyer(`window.vehicules(${JSON.stringify(affiches.map((v) => ({ ...v, icone: ICONES[v.type] })))}, ${JSON.stringify(suivre ?? null)})`);
  }, [affiches]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (recentrage) envoyer(`window.centrer(${recentrage.lat},${recentrage.lng},16)`);
  }, [recentrage?.cle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (centre && !ajuster) envoyer(`window.centrer(${centre.lat},${centre.lng})`);
  }, [centre?.lat, centre?.lng, ajuster]); // eslint-disable-line react-hooks/exhaustive-deps

  const message = (e: WebViewMessageEvent) => {
    const d = JSON.parse(e.nativeEvent.data);
    if (d.type === 'pret') {
      pret.current = true;
      envoyer(`window.statique(${statique})`);
    } else if (d.type === 'clic') onPress?.({ lat: d.lat, lng: d.lng });
  };

  return (
    <WebView ref={ref} source={{ html }} onMessage={message} originWhitelist={['*']} javaScriptEnabled
      style={{ flex: 1, backgroundColor: estNuit(nuit) ? '#0A1A2F' : '#F4F6F9' }} scrollEnabled={false} setSupportMultipleWindows={false} />
  );
}

const HTML = (c: { lat: number; lng: number }, zoom: number, nuit: boolean) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;width:100%;background:${nuit ? '#0A1A2F' : '#F4F6F9'}}
.tuiles{${nuit ? 'filter:invert(1) hue-rotate(185deg) brightness(.9) saturate(.6);' : 'filter:saturate(.75) brightness(1.03);'}}
.veh img{width:100%;height:100%;transition:transform .12s linear}.leaflet-marker-icon.veh{transition:transform .12s linear}
.radar{position:relative;width:200px;height:200px}.radar i{position:absolute;inset:0;border-radius:50%;border:2px solid #F78B03;background:rgba(247,139,3,.18);animation:onde 2.4s ease-out infinite;opacity:0}.radar i:nth-child(2){animation-delay:.8s}.radar i:nth-child(3){animation-delay:1.6s}@keyframes onde{0%{transform:scale(.15);opacity:.6}100%{transform:scale(1);opacity:0}}
.pt{border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('m',{zoomControl:false,attributionControl:true}).setView([${c.lat},${c.lng}],${zoom});
map.attributionControl.setPrefix(false);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,className:'tuiles',attribution:'© OpenStreetMap'}).addTo(map);
var couche=L.layerGroup().addTo(map),vehs={},contour=null,ligne=null,suivi=null,geste=0;
var COUL={depart:'${couleurs.primaire}',arrivee:'${couleurs.accent}',moi:'${couleurs.bleu}'};
map.on('dragstart zoomstart',function(){geste=Date.now();});
window.statique=function(e){couche.clearLayers();var pts=[];
 if(e.radar){L.marker([e.radar.lat,e.radar.lng],{interactive:false,icon:L.divIcon({className:'',iconSize:[200,200],iconAnchor:[100,100],html:'<div class="radar"><i></i><i></i><i></i></div>'})}).addTo(couche);}
 (e.zones||[]).forEach(function(z){L.circle([z.lat,z.lng],{radius:300+z.intensite*90,color:'${couleurs.accent}',weight:0,fillOpacity:Math.min(.6,.15+z.intensite*.07)}).addTo(couche);});
 (e.points||[]).forEach(function(p){var s=p.type==='arrivee'?20:16;L.marker([p.lat,p.lng],{icon:L.divIcon({className:'',iconSize:[s,s],iconAnchor:[s/2,s/2],html:'<div class="pt" style="width:'+s+'px;height:'+s+'px;background:'+COUL[p.type]+'"></div>'})}).addTo(couche);pts.push([p.lat,p.lng]);});
 if(contour){map.removeLayer(contour);map.removeLayer(ligne);contour=ligne=null;}
 if(e.trace&&e.trace.length>1){contour=L.polyline(e.trace,{color:'${nuit ? '#0A1A2F' : '#fff'}',weight:9}).addTo(map);ligne=L.polyline(e.trace,{color:'${nuit ? couleurs.accent : couleurs.primaire}',weight:5}).addTo(map);pts=pts.concat(e.trace);}
 if(e.ajuster&&pts.length>1){map.fitBounds(pts,{paddingTopLeft:[e.marges[3],e.marges[0]],paddingBottomRight:[e.marges[1],e.marges[2]],maxZoom:16});}else if(e.ajuster&&pts.length===1){map.setView(pts[0],15);}};
window.vehicules=function(liste,suivre){var vus={};liste.forEach(function(v){vus[v.id]=1;var m=vehs[v.id];
 if(!m){m=L.marker([v.lat,v.lng],{icon:L.divIcon({className:'veh',iconSize:[38,38],iconAnchor:[19,19],html:'<img src="'+v.icone+'">'})}).addTo(map);vehs[v.id]=m;}
 else m.setLatLng([v.lat,v.lng]);var img=m.getElement()&&m.getElement().querySelector('img');if(img)img.style.transform='rotate('+v.cap+'deg)';
 if(v.id===suivre&&Date.now()-geste>8000){map.panTo([v.lat,v.lng],{animate:true,duration:.5});}});
 Object.keys(vehs).forEach(function(id){if(!vus[id]){map.removeLayer(vehs[id]);delete vehs[id];}});};
window.centrer=function(a,b,z){map.flyTo([a,b],z||map.getZoom(),{duration:.8});};
map.on('click',function(ev){window.ReactNativeWebView.postMessage(JSON.stringify({type:'clic',lat:ev.latlng.lat,lng:ev.latlng.lng}));});
window.ReactNativeWebView.postMessage(JSON.stringify({type:'pret'}));
</script></body></html>`;
