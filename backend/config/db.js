const { Sequelize } = require('sequelize');
const { requireEnv } = require('./env');

// Connection options, in order of precedence:
//   1. DATABASE_URL=postgres://user:password@host:port/db
//   2. DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
//   3. DB_DIALECT=sqlite (local development only, file in DB_STORAGE)
// TLS, controlled by DB_SSL:
//   DB_SSL=false / disable  -> no TLS (local or CI PostgreSQL)
//   DB_SSL=no-verify        -> TLS without certificate verification
//   unset                   -> TLS with certificate verification
// Verification used to be off unconditionally (rejectUnauthorized: false),
// which accepts any certificate and so does not actually authenticate the
// server. `no-verify` keeps that behaviour available for a provider whose CA
// is not in Node's bundle, but it now has to be asked for explicitly.
const sslMode = (process.env.DB_SSL || '').toLowerCase();
const sslOption = () => {
  if (sslMode === 'false' || sslMode === 'disable') return {};
  if (sslMode === 'no-verify') return { ssl: { require: true, rejectUnauthorized: false } };
  return { ssl: { require: true, rejectUnauthorized: true } };
};

const postgresOptions = {
  dialect: 'postgres',
  logging: false,
  dialectOptions: sslOption(),
};

const createSequelize = () => {
  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, postgresOptions);
  }
  if (process.env.DB_DIALECT === 'sqlite') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || 'dev.sqlite',
      logging: false,
    });
  }
  if (process.env.DB_HOST) {
    return new Sequelize(requireEnv('DB_NAME'), requireEnv('DB_USER'), requireEnv('DB_PASSWORD'), {
      ...postgresOptions,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
    });
  }
  throw new Error(
    'No database configured. Set DATABASE_URL, or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD, ' +
      'or DB_DIALECT=sqlite for local development. See .env.example.'
  );
};

module.exports = createSequelize();
