import { logger } from '../utils/logger.js';

export const TOKEN_KEY = 'sms_auth_token';
export const USER_KEY = 'sms_auth_user';

const BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiClientError extends Error {
  constructor(status, code, message, details = []) {
    super(message || 'An error occurred while processing your request.');
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code || 'API_ERROR';
    this.details = Array.isArray(details) ? details : [];
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // LocalStorage quota or access error handled silently
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore clear errors
  }
}

export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = url.startsWith('/api') ? url : `/api${url}`;
  const fullUrl = BASE_URL ? `${BASE_URL}${apiPath}` : apiPath;

  const token = getToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(fullUrl, config);
  } catch (networkError) {
    logger.apiError(0, 'NETWORK_ERROR', fullUrl, networkError.message);
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Unable to connect to the server. Please check your network connection.');
  }

  // Handle 401 Unauthorized for authenticated requests: clear session and broadcast expiration.
  // Unauthenticated requests (e.g. invalid credentials on login) should throw without clearing or redirecting.
  const isAuthRequest = Boolean(headers['Authorization']);
  if (response.status === 401 && isAuthRequest) {
    clearSession();
    logger.authState('session_expired');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms:unauthorized'));
      if (window.location && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else if (contentType.includes('text/html')) {
    logger.apiError(response.status, 'HTML_RESPONSE_ERROR', fullUrl, 'Received HTML instead of JSON');
    throw new ApiClientError(
      response.status,
      'HTML_RESPONSE_ERROR',
      'The API endpoint returned HTML instead of JSON. Ensure your backend server is running and VITE_API_BASE_URL is configured correctly.'
    );
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorPayload = data && typeof data === 'object' ? data : {};
    const errorCode = errorPayload.error || (response.status === 404 ? 'NOT_FOUND' : 'API_ERROR');
    const errorMessage = errorPayload.message || response.statusText || 'Request failed';
    const errorDetails = errorPayload.details || [];

    logger.apiError(response.status, errorCode, fullUrl, errorMessage);
    throw new ApiClientError(response.status, errorCode, errorMessage, errorDetails);
  }

  return data;
}

apiClient.get = (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' });
apiClient.post = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
apiClient.put = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
apiClient.delete = (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' });

