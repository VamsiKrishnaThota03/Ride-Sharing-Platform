const { body } = require('express-validator');
const { Op } = require('sequelize');
const Feedback = require('../models/Feedback');
const RideShare = require('../models/RideShare');
const validate = require('../middleware/validate');

// Travelers and companions rate a ride they took part in.
exports.submitFeedback = [
  body('rideShareId').trim().notEmpty().withMessage('rideShareId is required.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number from 1 to 5.').toInt(),
  body('comment').optional().isString().trim().isLength({ max: 1000 }).withMessage('Comment is too long.'),
  validate,
  async (req, res) => {
    const { rideShareId, rating, comment } = req.body;
    try {
      const ride = await RideShare.findOne({
        where: {
          tripId: rideShareId,
          [Op.or]: [{ userId: req.user.id }, { companionMobile: req.user.mobile_number || '__none__' }],
        },
      });
      if (!ride) {
        return res.status(404).json({ message: 'Ride not found, or you were not part of it.' });
      }

      const feedback = await Feedback.create({ rideShareId, userId: req.user.id, rating, comment });
      return res.status(201).json({ message: 'Feedback submitted successfully.', feedback });
    } catch (error) {
      console.error('Error submitting feedback:', error.message);
      return res.status(500).json({ message: 'Error submitting feedback.' });
    }
  },
];
