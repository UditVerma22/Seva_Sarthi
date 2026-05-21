const router = require('express').Router();
const { getProfile, updateProfile, getMyBookings, getMyRentals, getDashboardStats } = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.get('/bookings', auth, getMyBookings);
router.get('/rentals', auth, getMyRentals);
router.get('/dashboard', auth, getDashboardStats);

module.exports = router;
