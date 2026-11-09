const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware, requireRole('admin'));
router.get('/users', adminController.getAllUsers);
router.get('/feedbacks', adminController.getAllFeedbacks);

module.exports = router;
