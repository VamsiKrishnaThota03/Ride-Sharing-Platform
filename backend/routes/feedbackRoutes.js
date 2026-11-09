const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send', authMiddleware, requireRole('traveler', 'traveler_companion'), feedbackController.submitFeedback);

module.exports = router;
