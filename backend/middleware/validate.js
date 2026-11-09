const { validationResult } = require('express-validator');

// Sends the first validation error as `{ message }` with a 400 status.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};
