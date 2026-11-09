const { body } = require('express-validator');
const RideShare = require('../models/RideShare');
const validate = require('../middleware/validate');

// Save shared ride details for the logged-in traveler
exports.saveRideShare = [
  body('tripId').trim().matches(/^[A-Za-z0-9_-]{1,64}$/).withMessage('Trip ID may only contain letters, numbers, - and _.'),
  body('driverName').trim().notEmpty().withMessage('Driver name is required.'),
  body('driverPhone').trim().matches(/^\+?[0-9 -]{7,15}$/).withMessage('Please enter a valid driver phone number.'),
  body('cabNumber').trim().notEmpty().withMessage('Cab number is required.'),
  body('companionMobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Companion mobile must be a 10-digit number.'),
  validate,
  async (req, res) => {
    const { tripId, driverName, driverPhone, cabNumber, companionMobile } = req.body;
    try {
      const existing = await RideShare.findOne({ where: { tripId } });
      if (existing) {
        return res.status(409).json({ message: 'A ride with this trip ID has already been shared.' });
      }

      const rideShare = await RideShare.create({
        tripId,
        driverName,
        driverPhone,
        cabNumber,
        companionMobile: companionMobile || null,
        userId: req.user.id,
        isActive: true,
      });
      return res.status(201).json({ message: 'Ride shared successfully', rideShare });
    } catch (error) {
      console.error('Error saving ride share:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
];

// Rides shared by the logged-in user, newest first
exports.getUserRideShares = async (req, res) => {
  try {
    const rides = await RideShare.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    return res.status(200).json(rides);
  } catch (error) {
    console.error('Error fetching rides:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark one of your own rides as finished
exports.expireRideShare = [
  body('tripId').trim().notEmpty().withMessage('Trip ID is required.'),
  validate,
  async (req, res) => {
    try {
      const rideShare = await RideShare.findOne({ where: { tripId: req.body.tripId } });
      if (!rideShare) return res.status(404).json({ message: 'Ride not found' });
      if (rideShare.userId !== req.user.id) {
        return res.status(403).json({ message: 'You can only end rides you shared.' });
      }

      rideShare.isActive = false;
      await rideShare.save();
      return res.status(200).json({ message: 'Ride marked as completed', rideShare });
    } catch (error) {
      console.error('Error expiring ride share:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
];

// Rides shared with the logged-in companion's mobile number (may be empty)
exports.getCompanionRideDetails = async (req, res) => {
  try {
    const rideShareDetails = await RideShare.findAll({
      where: { companionMobile: req.user.mobile_number },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(rideShareDetails);
  } catch (error) {
    console.error('Error fetching companion ride details:', error.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
