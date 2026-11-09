const jwt = require('jsonwebtoken');
const { requireEnv } = require('../config/env');

exports.generateToken = (id, email, role, mobile_number) =>
  jwt.sign({ id, email, role, mobile_number }, requireEnv('JWT_SECRET'), { expiresIn: '1h' });

exports.verifyToken = (token) => jwt.verify(token, requireEnv('JWT_SECRET'));
