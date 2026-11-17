import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export const useLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState('Yaoundé, Cameroun');
  const watcher = useRef<Location.LocationSubscription | null>(null);

  const refreshLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(current);
    const reverse = await Location.reverseGeocodeAsync(current.coords);
    const first = reverse[0];
    if (first) {
      setAddress([first.name, first.city, first.region, first.country].filter(Boolean).join(', '));
    }
    return current;
  }, []);

  useEffect(() => {
    let mounted = true;
    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !mounted) {
        return;
      }
      watcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000,
          distanceInterval: 5
        },
        async (current) => {
          if (!mounted) return;
          setLocation(current);
          if (!address || address === 'Yaoundé, Cameroun') {
            const reverse = await Location.reverseGeocodeAsync(current.coords);
            const first = reverse[0];
            if (first) {
              setAddress([first.name, first.city, first.region, first.country].filter(Boolean).join(', '));
            }
          }
        }
      );
    };

    startWatching();
    return () => {
      mounted = false;
      watcher.current?.remove();
      watcher.current = null;
    };
  }, [address]);

  return { location, address, refreshLocation };
};
