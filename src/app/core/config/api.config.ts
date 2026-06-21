const isLocalhost =
  typeof globalThis.location !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(globalThis.location.hostname);

const PRODUCTION_BACKEND_URL = 'https://f1-tracker-backend-ahni.onrender.com/api';

export const BACKEND_URL = isLocalhost ? 'http://localhost:3000/api' : PRODUCTION_BACKEND_URL;
export const HTTP_OPTIONS = { withCredentials: true };
