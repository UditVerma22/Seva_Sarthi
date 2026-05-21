const router = require('express').Router();
const { createReview, getProviderReviews } = require('../controllers/review.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, createReview);
router.get('/provider/:id', getProviderReviews);

module.exports = router;
