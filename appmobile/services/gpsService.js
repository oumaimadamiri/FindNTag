import * as Location from 'expo-location';
import { locationService } from './apiService';

export const gpsService = {
  getCurrentLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    return location.coords;
  },

  trackAnimal: async (animalId, updateInterval = 30000) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: updateInterval,
        distanceInterval: 50 // meters
      },
      async (location) => {
        await locationService.saveLocation(
          animalId,
          location.coords.latitude,
          location.coords.longitude
        );
      }
    );

    // Retourne une fonction pour arrêter le tracking
    return () => {
      subscription.remove();
    };
  },

  getLocationHistory: async (animalId) => {
    return locationService.getLocationHistory(animalId);
  }
};
