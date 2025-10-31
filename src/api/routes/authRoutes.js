const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/signup - Sign up a new user
router.post('/signup', authController.signUp);

// POST /api/auth/signin - Sign in a user
router.post('/signin', authController.signIn);

// POST /api/auth/signout - Sign out a user
router.post('/signout', authController.signOut);

// POST /api/auth/refresh - Exchange refresh token for a new session
router.post('/refresh', authController.refreshSession);

// GET /api/auth/me - Get current user (requires auth)
router.get('/me', authController.getCurrentUser);

module.exports = router;