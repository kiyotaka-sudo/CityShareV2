/**
 * Accès au gestionnaire de cartes hors ligne de MapLibre, par le même import ES que la carte native :
 * un `require` direct du paquet chargerait sa version CommonJS et enregistrerait deux fois les vues natives.
 */
export { OfflineManager } from '@maplibre/maplibre-react-native';
