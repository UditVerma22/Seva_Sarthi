const router = require('express').Router();
const { createOrder, verifyPayment, getKey } = require('../controllers/payment.controller');
const { auth } = require('../middleware/auth');

router.get('/key', getKey);
router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);

module.exports = router;
