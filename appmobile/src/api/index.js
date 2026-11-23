import client from "./client";
import { API_URL } from "../config";

const multipart = {
  headers: { "Content-Type": "multipart/form-data" },
  timeout: 90000,
};

const imageFormData = (uri, name = "photo.jpg") => {
  const formData = new FormData();
  formData.append("file", { uri, type: "image/jpeg", name });
  return formData;
};

export const ocrApi = {
  /** Renvoie { cin, nom, prenom } (passe par le backend, plus d'appel direct à Flask) */
  extractCin: async (uri) => {
    const res = await client.post(
      "/ocr/cin",
      imageFormData(uri, "cin.jpg"),
      multipart,
    );
    return res.data?.data ?? {};
  },
};

export const authApi = {
  register: async (uri, fields) => {
    const formData = imageFormData(uri, "cin.jpg");
    Object.entries(fields).forEach(([key, value]) =>
      formData.append(key, value ?? ""),
    );
    return (await client.post("/auth/register", formData, multipart)).data;
  },
  /** Envoie le code par email. Renvoie { maskedEmail } */
  requestOtp: async (cin) =>
    (await client.post("/auth/request-otp", { cin })).data,
  /** Renvoie { token, user } */
  verifyOtp: async (cin, code) =>
    (await client.post("/auth/verify-otp", { cin, code })).data,
};

export const usersApi = {
  me: async () => (await client.get("/users/me")).data,
  getByCin: async (cin) =>
    (await client.get(`/users/${encodeURIComponent(cin)}`)).data,
  /** Infos minimales d'un acheteur : { cin, nom, prenom, telephone } */
  lookup: async (cin) =>
    (await client.get(`/users/lookup/${encodeURIComponent(cin)}`)).data,
  remove: async (id) => client.delete(`/users/${id}`),
  savePushToken: async (token) =>
    (await client.put("/users/me/push-token", { token })).data,
};

export const animalsApi = {
  listByCin: async (cin) =>
    (await client.get(`/animals/user/${encodeURIComponent(cin)}`)).data,
  countByCin: async (cin) =>
    (await client.get(`/animals/count/by-user/${encodeURIComponent(cin)}`))
      .data,
  /** Ancien format de tag : identifiant matériel (UID) du tag */
  getByTag: async (tagId) =>
    (await client.get(`/animals/tag/${encodeURIComponent(tagId)}`)).data,
  /** Nouveau format : identifiant public lu sur le tag (uniquement SES animaux) */
  getByPublicId: async (publicId) =>
    (await client.get(`/animals/by-public-id/${encodeURIComponent(publicId)}`))
      .data,
  getPhotoByTag: async (tagId) =>
    (await client.get(`/animals/photo/${encodeURIComponent(tagId)}`)).data
      ?.fileUrl,
  create: async (animal) => (await client.post("/animals", animal)).data,
  update: async (id, animal) =>
    (await client.put(`/animals/${id}`, animal)).data,
  remove: async (id) => client.delete(`/animals/${id}`),
  // Le header "cin" disparaîtra en phase 2 (remplacé par le JWT)
  transfer: async (id, _fromCin, toCin) =>
    (await client.post(`/animals/${id}/transfer`, { toCin })).data,
};

export const publicApi = {
  /** Sans compte : { nom, race, age, photoUrl, ownerPrenom, ownerTelephone } */
  getAnimal: async (publicId) =>
    (await client.get(`/public/animals/${encodeURIComponent(publicId)}`)).data,
};

export const gpsApi = {
  getLocation: async (animalId) => (await client.get(`/gps/${animalId}`)).data,
};

export const trackingApi = {
  getPositions: async (animalId, limit = 100) =>
    (await client.get(`/animals/${animalId}/positions`, { params: { limit } }))
      .data,
  getGeofence: async (animalId) =>
    (await client.get(`/animals/${animalId}/geofence`)).data,
  saveGeofence: async (animalId, { enabled, points }) =>
    (await client.put(`/animals/${animalId}/geofence`, { enabled, points }))
      .data,
  /** Renvoie { deviceId, lastSeenAt } ou null s'il n'y a pas de traceur */
  getTracker: async (animalId) => {
    try {
      return (await client.get(`/animals/${animalId}/tracker`)).data;
    } catch (e) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },
  setTracker: async (animalId, deviceId) =>
    (await client.put(`/animals/${animalId}/tracker`, { deviceId })).data,
  removeTracker: async (animalId) =>
    client.delete(`/animals/${animalId}/tracker`),
};

/** Construit l'URL d'une image : chemins "/uploads/..." et anciennes URL contenant une IP. */
export const mediaUrl = (path) => {
  if (!path) return null;
  if (/^(data:|file:)/.test(path)) return path;
  const legacy = path.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/);
  if (legacy) return `${API_URL}${legacy[1]}`;
  if (/^https?:/.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};
