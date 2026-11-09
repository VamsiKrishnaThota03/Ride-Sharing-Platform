// Reads configuration from the environment and fails fast with a clear message
// instead of silently falling back to a hard-coded secret.
require('dotenv').config();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env and set it.`);
  }
  return value.trim();
};

const listEnv = (name) =>
  (process.env[name] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = { requireEnv, listEnv };
