// Valeurs lues dans appmobile/.env.local (redémarrer avec `npx expo start --clear` après un changement)
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081').replace(/\/$/, '');

// Temporaire : supprimé en phase 4 (multi-animaux)
export const TRACKED_ANIMAL_ID = Number(process.env.EXPO_PUBLIC_TRACKED_ANIMAL_ID || 1);