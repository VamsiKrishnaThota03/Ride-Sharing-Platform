const express = require('express');
const cors = require('cors');
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
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'ride-sharing-platform-backend' }));

app.use('/api', authRoutes);
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
