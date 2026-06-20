const isLocalhost =
  typeof globalThis.location !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(globalThis.location.hostname);

export const BACKEND_URL = isLocalhost ? 'http://localhost:3000/api' : '/api';
export const HTTP_OPTIONS = { withCredentials: true };
