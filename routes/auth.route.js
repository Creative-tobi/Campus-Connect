const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    registerUser,
    loginUser,
    verifyOtpController,
    regenerateOtpController,
    getProfile,
    updateProfile,
    changePassword
} = require('../controllers/auth.controller');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtpController);
router.post('/regenerate-otp', regenerateOtpController);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;