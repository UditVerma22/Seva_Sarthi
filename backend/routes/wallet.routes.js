const router = require('express').Router();
const {
  getMyWallet,
  createTopUpOrder,
  verifyTopUp,
  getAllWallets,
  getRevenueStats,
} = require('../controllers/wallet.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Provider routes
router.get('/', auth, getMyWallet);
router.post('/topup/create-order', auth, createTopUpOrder);
router.post('/topup/verify', auth, verifyTopUp);

// Admin routes
router.get('/admin/all', auth, authorize('admin'), getAllWallets);
router.get('/admin/revenue', auth, authorize('admin'), getRevenueStats);

module.exports = router;
