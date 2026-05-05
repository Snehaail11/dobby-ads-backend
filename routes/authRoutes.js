const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes (no auth middleware)
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected route (auth middleware required)
router.get('/me', auth, authController.getMe);

module.exports = router;