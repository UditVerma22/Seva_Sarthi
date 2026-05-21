const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { chat, analyzeIssueImage, extractIntent } = require('../controllers/ai.controller');

// Both routes use optionalAuth — works for guests AND logged-in users
// Logged-in users get personalized responses (booking history, name, etc.)

router.post('/chat', optionalAuth, chat);
router.post('/analyze-image', optionalAuth, analyzeIssueImage);
router.post('/extract-intent', optionalAuth, extractIntent);

module.exports = router;
