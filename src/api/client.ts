import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'jungle_nft_auth_token';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const hasToken = Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
      if (hasToken) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new Event('auth:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);
