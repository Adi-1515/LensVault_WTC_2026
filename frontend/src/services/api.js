import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (email, password) => api.post('/api/auth/register', { email, password });
export const login = (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  return api.post('/api/auth/token', formData);
};
export const getMe = () => api.get('/api/auth/me');

// Photos
export const uploadPhoto = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/photos/upload', formData, { onUploadProgress });
};

export const getTimeline = (page = 1, limit = 50, filter = null) => {
  const params = new URLSearchParams({ page, limit });
  if (filter) params.append('filter', filter);
  return api.get(`/api/photos/?${params}`);
};
export const getPhoto = id => api.get(`/api/photos/${id}`);
export const toggleFavourite = id => api.patch(`/api/photos/${id}/favourite`);
export const deletePhoto = id => api.delete(`/api/photos/${id}`);
export const updatePhotoMetadata = (id, data) => api.patch(`/api/photos/${id}/metadata`, data);
export const updatePhotoLocation = (id, latitude, longitude) => api.patch(`/api/photos/${id}/location`, { latitude, longitude });


// Smart Categories
export const getMemories = () => api.get('/api/photos/memories');
export const getGeotagged = () => api.get('/api/photos/geotagged');
export const getStats = () => api.get('/api/photos/stats');

// Albums
export const getAlbums = () => api.get('/api/albums/');
export const createAlbum = (name, description) => api.post('/api/albums/', { name, description });
export const getAlbum = id => api.get(`/api/albums/${id}`);
export const updateAlbum = (id, data) => api.patch(`/api/albums/${id}`, data);
export const deleteAlbum = id => api.delete(`/api/albums/${id}`);
export const addPhotoToAlbum = (albumId, photoId) => api.post(`/api/albums/${albumId}/photos`, { photo_id: photoId });
export const addPhotosToAlbum = (albumId, photoIds) => api.post(`/api/albums/${albumId}/photos`, { photo_ids: photoIds });
export const removePhotoFromAlbum = (albumId, photoId) => api.delete(`/api/albums/${albumId}/photos/${photoId}`);
export const shareAlbum = (albumId) => api.post(`/api/albums/${albumId}/share`);

// Search
export const searchPhotos = query => api.get(`/api/search/?q=${encodeURIComponent(query)}`);

// URL helpers — attach token so standard <img> tags authenticate
export const getThumbnailUrl = (id, size = 'medium') => {
  const token = localStorage.getItem('token');
  return `/api/photos/${id}/thumbnail/${size}?token=${token}`;
};

export const getOriginalUrl = id => {
  const token = localStorage.getItem('token');
  return `/api/photos/${id}/original?token=${token}`;
};

// Faces & People
export const getFaceClusters = () => api.get('/api/faces/clusters');
export const getPersons = () => api.get('/api/faces/persons');
export const getPersonPhotos = (personId) => api.get(`/api/faces/persons/${personId}/photos`);
export const assignCluster = (clusterId, name) => api.post(`/api/faces/clusters/${clusterId}/assign`, { name });
export const triggerClustering = () => api.post('/api/faces/cluster');

export const getFaceImageUrl = (faceId) => {
  const token = localStorage.getItem('token');
  return `/api/faces/${faceId}/image?token=${token}`;
};

export default api;
