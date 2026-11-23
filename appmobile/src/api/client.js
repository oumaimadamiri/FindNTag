import axios from 'axios';
import { API_URL } from '../config';

let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token;
};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    const type = String(response.headers?.['content-type'] ?? '');
    if (type.includes('text/html')) {
      throw new Error('Réponse HTML inattendue : vérifiez EXPO_PUBLIC_API_URL (port 8081 ?)');
    }
    return response;
  },
  (error) => {
    const url = error.config?.url ?? '';
    // Jeton expiré ou refusé (hors écrans de connexion) : on déconnecte
    if (error.response?.status === 401 && authToken && !url.startsWith('/auth/')) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default client;