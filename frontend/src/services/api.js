/**
 * Axios HTTP client configuration for API requests.
 * 
 * This module sets up a configured axios instance with:
 * - Base URL from environment variable (or localhost default)
 * - Automatic JWT token injection from localStorage
 * - Automatic token cleanup on 401 Unauthorized responses
 * 
 * Usage:
 *   import api from './services/api.js';
 *   const response = await api.get('/search', { params: { q: 'react' } });
 */
import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api",
  withCredentials: false, // Don't send cookies (using JWT tokens instead)
});

// Request interceptor: Add JWT token to all requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get 401 Unauthorized, token is invalid/expired
    // Clear stored auth data to force re-login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  },
);

export default api;

