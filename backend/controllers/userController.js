const { body } = require('express-validator');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/User');
const validate = require('../middleware/validate');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.editProfile = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
  body('mobile_number').trim().matches(/^\d{10}$/).withMessage('Please enter a valid 10-digit mobile number.'),
  validate,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { name, email, mobile_number } = req.body;
      user.name = name;
      user.email = email;
      user.mobile_number = mobile_number;
      await user.save();

      const { password, ...profile } = user.toJSON();
      res.json({
        message: 'Profile updated. Log in again if you changed your email or mobile number.',
        user: profile,
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      console.error('Error updating profile:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
];
