const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/db');
const { listEnv } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');

// CORS_ORIGIN is a comma-separated allow list. When unset every origin is allowed,
// which is fine for local development; set it in production.
const allowedOrigins = listEnv('CORS_ORIGIN');

const app = express();
app.disable('x-powered-by');
// One proxy hop on Render and similar hosts, so req.ip is the real client
// address for the rate limiters. Trusting every hop would let a caller spoof
// X-Forwarded-For and bypass them.
app.set('trust proxy', 1);

app.use(
  helmet({
    // A JSON API on a different origin from the SPA: nothing here is ever
    // loaded as a subresource, so deny everything.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '100kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Tighter ceiling on credentials, keyed on IP plus the submitted email so one
// attacker behind a NAT cannot lock out everyone sharing that address.
// Successes count too, so a valid login cannot refill an attacker's budget.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${req.ip || 'unknown'}:${email}`;
  },
  message: { message: 'Too many authentication attempts, please try again in 15 minutes.' },
});

app.use(globalLimiter);

// Liveness: the process is accepting connections. Independent of the database,
// so a transient blip does not make the platform restart a healthy process.
app.get('/', (req, res) => res.json({ status: 'ok', service: 'ride-sharing-platform-backend' }));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Readiness: the process can actually serve data.
app.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready' });
  } catch (error) {
    res.set('Retry-After', '30');
    res.status(503).json({ status: 'unavailable', message: 'Database unreachable' });
  }
});

// authRoutes is mounted at /api and carries /register and /login, so the
// limiter is applied to the whole tree rather than to individual paths.
app.use('/api', authLimiter, authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Server error. Please try again later.' });
});

module.exports = app;
