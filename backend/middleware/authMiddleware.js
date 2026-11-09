const { verifyToken } = require('../utils/jwtUtils');

// Verifies the `Authorization: Bearer <token>` header and sets req.user.
exports.authMiddleware = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access denied. Please log in.' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
};

// Use after authMiddleware: allows only the given roles.
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
  }
  next();
};
