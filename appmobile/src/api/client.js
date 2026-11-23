import axios from 'axios';
import { API_URL } from '../config';

let authToken = null;
// Utilisé à partir de la phase 2 (JWT)
export const setAuthToken = (token) => {
  authToken = token;
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

export default client;