const { requireEnv } = require('./config/env');

// Fail fast if required configuration is missing.
let sequelize;
try {
  requireEnv('JWT_SECRET');
  sequelize = require('./config/db');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = require('./app');
const attachRealtime = require('./realtime');

const PORT = Number(process.env.PORT) || 5001;
// Loopback by default, so a development server is never reachable from the
// local network. Managed platforms route traffic into the container and need an
// all-interfaces bind, so they are detected by their own env markers; HOST
// overrides both.
const HOST =
  process.env.HOST ||
  (process.env.RENDER ||
  process.env.FLY_APP_NAME ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.DYNO
    ? '0.0.0.0'
    : '127.0.0.1');

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Database connected and synchronized');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () =>
    console.log(`Server running on http://${HOST}:${PORT}`)
  );
  const wss = attachRealtime(server);

  // Drain in-flight requests and close WebSocket clients when the platform
  // replaces the container, so a deploy does not drop live trip streams.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    if (wss && typeof wss.close === 'function') wss.close();
    server.close(async () => {
      try {
        await sequelize.close();
      } catch {
        // Already closed; nothing useful to do here.
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
