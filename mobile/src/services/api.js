import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Change this to your backend URL ──────────────────────────────────────────
// Set EXPO_PUBLIC_API_URL in your .env file, or replace the fallback below
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.1:5000/api';

const TOKEN_KEY = '@hookadrop_token';

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setToken(token) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function removeToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  get:    (path, auth = true)              => request('GET',    path, null, auth),
  post:   (path, body, auth = true)        => request('POST',   path, body, auth),
  put:    (path, body, auth = true)        => request('PUT',    path, body, auth),
  patch:  (path, body, auth = true)        => request('PATCH',  path, body, auth),
  delete: (path, auth = true)             => request('DELETE', path, null, auth),
};
