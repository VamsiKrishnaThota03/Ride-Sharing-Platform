import { jwtDecode } from 'jwt-decode';

export const ROLE_LABELS = {
  traveler: 'Traveler',
  traveler_companion: 'Companion',
  admin: 'Admin',
};

export const dashboardPath = (role) =>
  ({ traveler: '/traveler-dashboard', traveler_companion: '/companion-dashboard', admin: '/admin-dashboard' }[role] || '/');

export const getToken = () => localStorage.getItem('token');

// Decoded token ({ id, email, role, mobile_number }) or null if missing / expired.
export const getSession = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const saveSession = (token, role) => {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('isLoggedIn');
};

export const authHeader = () => ({ Authorization: `Bearer ${getToken() || ''}` });

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request && !error.response) return 'Unable to reach the server. Please try again later.';
  return fallback;
};

export const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
