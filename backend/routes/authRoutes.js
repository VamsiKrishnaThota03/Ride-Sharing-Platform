const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/user/profile', authMiddleware, userController.getUserProfile);
router.put('/user/profile', authMiddleware, userController.editProfile);

module.exports = router;
