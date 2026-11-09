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

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Database connected and synchronized');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  attachRealtime(server);
};

start();
