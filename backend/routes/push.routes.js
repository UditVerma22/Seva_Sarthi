const express = require('express');
const router = express.Router();
const { subscribe } = require('../controllers/push.controller');
const { auth } = require('../middleware/auth');

router.post('/subscribe', auth, subscribe);

module.exports = router;
