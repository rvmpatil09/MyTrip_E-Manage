export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('trip_token') || localStorage.getItem('token');

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('trip_token');
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');

    if (!window.location.pathname.includes('/login')) {
      alert('Your session has expired. Please sign in again.');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  return response;
}