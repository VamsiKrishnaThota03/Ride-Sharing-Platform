const express = require('express');
const rideController = require('../controllers/rideController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/share', authMiddleware, requireRole('traveler'), rideController.saveRideShare);
router.get('/shared', authMiddleware, rideController.getUserRideShares);
router.post('/expire', authMiddleware, requireRole('traveler'), rideController.expireRideShare);
router.get('/companion/details', authMiddleware, requireRole('traveler_companion'), rideController.getCompanionRideDetails);

module.exports = router;
