import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          err.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(err.config);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (email: string, name: string, password: string) =>
    api.post("/api/auth/register", { email, name, password }),
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  me: () => api.get("/api/auth/me"),
  logout: () => api.delete("/api/auth/logout"),
};

// Trips
export const tripsApi = {
  list: () => api.get("/api/trips"),
  create: (data: object) => api.post("/api/trips", data),
  get: (id: string) => api.get(`/api/trips/${id}`),
  update: (id: string, data: object) => api.put(`/api/trips/${id}`, data),
  delete: (id: string) => api.delete(`/api/trips/${id}`),
  listDays: (id: string) => api.get(`/api/trips/${id}/days`),
  addDay: (id: string, data: object) => api.post(`/api/trips/${id}/days`, data),
  listMemos: (id: string) => api.get(`/api/trips/${id}/memos`),
  createMemo: (id: string, data: object) => api.post(`/api/trips/${id}/memos`, data),
  listPhotos: (id: string) => api.get(`/api/trips/${id}/photos`),
  getShareLink: (id: string) => api.get(`/api/trips/${id}/share`),
};

// Waypoints
export const waypointsApi = {
  add: (tripId: string, dayId: string, data: object) =>
    api.post(`/api/trips/${tripId}/days/${dayId}/waypoints`, data),
  update: (id: string, data: object) => api.put(`/api/waypoints/${id}`, data),
  delete: (id: string) => api.delete(`/api/waypoints/${id}`),
  reorder: (tripId: string, dayId: string, ids: string[]) =>
    api.put(`/api/trips/${tripId}/days/${dayId}/waypoints/reorder`, ids),
};

// Memos
export const memosApi = {
  update: (id: string, data: object) => api.put(`/api/memos/${id}`, data),
  delete: (id: string) => api.delete(`/api/memos/${id}`),
};

// Maps
export const mapsApi = {
  search: (q: string) => api.get(`/api/maps/search?q=${encodeURIComponent(q)}`),
  directions: (origin: string, destination: string, mode = "driving") =>
    api.get(`/api/maps/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}`),
  geocode: (lat: number, lng: number) =>
    api.get(`/api/maps/geocode?lat=${lat}&lng=${lng}`),
};
