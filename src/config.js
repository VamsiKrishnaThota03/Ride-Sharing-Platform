// Runtime configuration. Set these in a .env file (see .env.example) or in the
// hosting provider's environment settings; REACT_APP_* values are read at build time.
const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://ride-sharing-platform-backend.onrender.com'
    : 'http://localhost:5001';

export const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

// ws:// or wss:// version of the backend URL for the trip WebSocket.
export const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

// Public URL of this frontend, used in the links shared over WhatsApp.
export const FRONTEND_URL = (process.env.REACT_APP_FRONTEND_URL || window.location.origin).replace(/\/+$/, '');

// A shared ride is shown as expired this many minutes after it was created.
export const RIDE_EXPIRY_MINUTES = 60;
