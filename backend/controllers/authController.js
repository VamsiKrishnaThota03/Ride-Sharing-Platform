const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/User');
const RideShare = require('../models/RideShare');
const jwtUtils = require('../utils/jwtUtils');
const validate = require('../middleware/validate');
const { listEnv } = require('../config/env');

const SELF_SERVICE_ROLES = ['traveler', 'traveler_companion'];

// Admin accounts can only be created for the emails in ADMIN_EMAILS.
const isAdminEmail = (email) =>
  listEnv('ADMIN_EMAILS')
    .map((item) => item.toLowerCase())
    .includes(String(email).toLowerCase());

const publicUser = (user) => {
  const { password, ...rest } = user.toJSON();
  return rest;
};

exports.signup = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('mobile_number').trim().matches(/^\d{10}$/).withMessage('Please enter a valid 10-digit mobile number.'),
  body('role').optional().isIn([...SELF_SERVICE_ROLES, 'admin']).withMessage('Invalid role.'),
  validate,
  async (req, res) => {
    const { name, email, mobile_number, password } = req.body;
    let role = req.body.role || 'traveler';

    if (role === 'admin' && !isAdminEmail(email)) {
      return res.status(403).json({ message: 'Admin accounts cannot be created from the sign-up form.' });
    }
    if (isAdminEmail(email)) role = 'admin';

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, mobile_number, password: hashedPassword, role });
      res.status(201).json({ message: 'User created successfully', user: publicUser(user) });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      console.error('Signup error:', error.message);
      res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
  },
];

exports.login = [
  body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      const isMatch = user ? await bcrypt.compare(password, user.password) : false;
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = jwtUtils.generateToken(user.id, user.email, user.role, user.mobile_number);
      const response = {
        message: 'Login successful',
        token,
        role: user.role,
        mobile_number: user.mobile_number,
      };

      // Companions also get the rides shared with their mobile number (may be empty).
      if (user.role === 'traveler_companion') {
        response.rideShareDetails = await RideShare.findAll({
          where: { companionMobile: user.mobile_number },
          order: [['createdAt', 'DESC']],
        });
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
  },
];
