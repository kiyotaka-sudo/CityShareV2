import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, MapViewProps } from 'react-native-maps';
import { colors } from '../theme/colors';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  label?: string;
}

interface MapViewOSMProps {
  fullScreen?: boolean;
  carLocation?: { latitude: number; longitude: number };
  userLocation?: { latitude: number; longitude: number };
  routePoints?: RoutePoint[];
}

export default function MapViewOSM({ fullScreen, carLocation, userLocation, routePoints }: MapViewOSMProps) {
  const mapRef = useRef<MapView | null>(null);
  const routeCoords = useMemo(
    () => (routePoints || []).map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
    [routePoints]
  );

  const region = useMemo(() => {
    if (routeCoords.length) {
      const first = routeCoords[0];
      return {
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35
      };
    }
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35
      };
    }
    return {
      latitude: 4.05,
      longitude: 11.53,
      latitudeDelta: 5,
      longitudeDelta: 5
    };
  }, [routeCoords, userLocation]);

  useEffect(() => {
    if (mapRef.current && routeCoords.length > 0) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 80, bottom: 180, left: 80 },
        animated: true
      });
    }
  }, [routeCoords]);

  return (
    <View style={fullScreen ? styles.full : styles.map}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={true}
        toolbarEnabled={false}
        zoomControlEnabled={true}
        loadingEnabled={true}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor={colors.primary}
            lineCap="round"
          />
        )}

        {routePoints?.map((point, index) => (
          <Marker
            key={`${point.latitude}-${point.longitude}-${index}`}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.label ?? `Étape ${index + 1}`}
          />
        ))}

        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            title="Vous"
            pinColor="blue"
          />
        )}

        {carLocation && (
          <Marker
            coordinate={{ latitude: carLocation.latitude, longitude: carLocation.longitude }}
            title="Trajet"
            pinColor="green"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%', overflow: 'hidden' },
  full: { flex: 1, overflow: 'hidden' }
});
