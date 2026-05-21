const router = require('express').Router();
const { 
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getHomeOffers,
  getEligibleCoupons,
  validateCoupon 
} = require('../controllers/coupon.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public routes
router.get('/home', getHomeOffers);

// Protected routes (User)
router.get('/eligible', auth, getEligibleCoupons);
router.post('/validate', auth, validateCoupon);

// Admin routes
router.use('/admin', auth, authorize('admin'));
router.route('/admin')
  .get(getAllCoupons)
  .post(createCoupon);

router.route('/admin/:id')
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;
