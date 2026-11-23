import client from './client';
import { API_URL } from '../config';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 };

const imageFormData = (uri, name = 'photo.jpg') => {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name });
  return formData;
};

export const ocrApi = {
  /** Renvoie { cin, nom, prenom } (passe par le backend, plus d'appel direct à Flask) */
  extractCin: async (uri) => {
    const res = await client.post('/ocr/cin', imageFormData(uri, 'cin.jpg'), multipart);
    return res.data?.data ?? {};
  },
};

export const authApi = {
  register: async (uri, fields) => {
    const formData = imageFormData(uri, 'cin.jpg');
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value ?? ''));
    return (await client.post('/auth/register', formData, multipart)).data;
  },
  sendOtp: async (email) => (await client.post('/auth/send-otp', { email })).data,
  setOtp: async (email, pin) => (await client.post('/auth/set-otp', { email, pin })).data,
  verifyOtp: async (email, pin) => (await client.post('/auth/verify-otp', { email, pin })).data,
};

export const usersApi = {
  checkCin: async (cin) => (await client.get(`/users/check_cin/${encodeURIComponent(cin)}`)).data.exists,
  getByCin: async (cin) => (await client.get(`/users/${encodeURIComponent(cin)}`)).data,
  remove: async (id) => client.delete(`/users/${id}`),
};

export const animalsApi = {
  listByCin: async (cin) => (await client.get(`/animals/user/${encodeURIComponent(cin)}`)).data,
  countByCin: async (cin) => (await client.get(`/animals/count/by-user/${encodeURIComponent(cin)}`)).data,
  getByTag: async (tagId) => (await client.get(`/animals/tag/${encodeURIComponent(tagId)}`)).data,
  getPhotoByTag: async (tagId) => (await client.get(`/animals/photo/${encodeURIComponent(tagId)}`)).data?.fileUrl,
  create: async (animal) => (await client.post('/animals', animal)).data,
  update: async (id, animal) => (await client.put(`/animals/${id}`, animal)).data,
  remove: async (id) => client.delete(`/animals/${id}`),
  // Le header "cin" disparaîtra en phase 2 (remplacé par le JWT)
  transfer: async (id, fromCin, toCin) =>
    (await client.post(`/animals/${id}/transfer`, { toCin }, { headers: { cin: fromCin } })).data,
};

export const gpsApi = {
  getLocation: async (animalId) => (await client.get(`/gps/${animalId}`)).data,
};

/** Construit l'URL d'une image : chemins "/uploads/..." et anciennes URL contenant une IP. */
export const mediaUrl = (path) => {
  if (!path) return null;
  if (/^(data:|file:)/.test(path)) return path;
  const legacy = path.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/);
  if (legacy) return `${API_URL}${legacy[1]}`;
  if (/^https?:/.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};