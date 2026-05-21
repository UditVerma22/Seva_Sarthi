const Razorpay = require('razorpay');
const crypto = require('crypto');
const ProviderWallet = require('../models/ProviderWallet');
const Provider = require('../models/Provider');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Lazy-initialize Razorpay instance
let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

// Helper: get or create wallet for a provider
const getOrCreateWallet = async (providerId) => {
  let wallet = await ProviderWallet.findOne({ providerId });
  if (!wallet) {
    wallet = await ProviderWallet.create({ providerId, balance: 0 });
  }
  return wallet;
};

// @desc    Get provider's own wallet
// @route   GET /api/wallet
// @access  Private (Provider)
const getMyWallet = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const wallet = await getOrCreateWallet(provider._id);

  // Return transactions sorted newest first (last 50)
  const recentTransactions = wallet.transactions
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  res.status(200).json(
    new ApiResponse(200, {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalPlatformFees: wallet.totalPlatformFees,
      totalTopUps: wallet.totalTopUps,
      transactions: recentTransactions,
    }, 'Wallet retrieved.')
  );
});

// @desc    Create Razorpay order for wallet top-up
// @route   POST /api/wallet/topup/create-order
// @access  Private (Provider)
const createTopUpOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount < 10) {
    throw new ApiError(400, 'Minimum top-up amount is ₹10.');
  }
  if (amount > 50000) {
    throw new ApiError(400, 'Maximum top-up amount is ₹50,000.');
  }

  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const options = {
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `topup_${Date.now()}_${req.user._id.toString().slice(-6)}`,
    notes: {
      type: 'wallet_topup',
      providerId: provider._id.toString(),
      userId: req.user._id.toString(),
    },
  };

  const order = await getRazorpay().orders.create(options);

  res.status(201).json(
    new ApiResponse(201, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    }, 'Top-up order created.')
  );
});

// @desc    Verify Razorpay payment and credit wallet
// @route   POST /api/wallet/topup/verify
// @access  Private (Provider)
const verifyTopUp = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

  // 1. Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new ApiError(400, 'Payment verification failed. Invalid signature.');
  }

  // 2. Credit wallet
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const wallet = await getOrCreateWallet(provider._id);
  const topUpAmount = amount / 100; // Convert paise to rupees

  wallet.credit(topUpAmount, `Wallet top-up via Razorpay`, 'topup', {
    razorpayPaymentId: razorpay_payment_id,
  });

  await wallet.save();

  res.status(200).json(
    new ApiResponse(200, {
      balance: wallet.balance,
      credited: topUpAmount,
    }, `₹${topUpAmount} added to wallet successfully.`)
  );
});

// @desc    Get all provider wallets (Admin)
// @route   GET /api/wallet/admin/all
// @access  Private (Admin)
const getAllWallets = asyncHandler(async (req, res) => {
  const wallets = await ProviderWallet.find()
    .populate({
      path: 'providerId',
      select: 'businessName category',
      populate: { path: 'userId', select: 'name email avatar' },
    })
    .sort({ balance: -1 });

  res.status(200).json(
    new ApiResponse(200, { wallets }, 'All wallets retrieved.')
  );
});

// @desc    Get platform revenue stats (Admin)
// @route   GET /api/wallet/admin/revenue
// @access  Private (Admin)
const getRevenueStats = asyncHandler(async (req, res) => {
  // Aggregate platform fees from all wallets
  const result = await ProviderWallet.aggregate([
    {
      $group: {
        _id: null,
        totalPlatformFees: { $sum: '$totalPlatformFees' },
        totalProviderEarnings: { $sum: '$totalEarned' },
        totalTopUps: { $sum: '$totalTopUps' },
      },
    },
  ]);

  // Also compute from bookings directly for accuracy
  const Booking = require('../models/Booking');
  const [onlineFees, codFees, totalBookingRevenue] = await Promise.all([
    // Platform fees from completed online bookings
    Booking.aggregate([
      { $match: { status: 'completed', paymentMethod: 'online' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ]),
    // Platform fees from completed COD bookings
    Booking.aggregate([
      { $match: { status: 'completed', paymentMethod: 'cash_after_service' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ]),
    // Total gross transaction volume
    Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      platformRevenue: (onlineFees[0]?.total || 0) + (codFees[0]?.total || 0),
      onlinePlatformFees: onlineFees[0]?.total || 0,
      codPlatformFees: codFees[0]?.total || 0,
      grossTransactionVolume: totalBookingRevenue[0]?.total || 0,
      walletStats: result[0] || { totalPlatformFees: 0, totalProviderEarnings: 0, totalTopUps: 0 },
    }, 'Revenue stats retrieved.')
  );
});

module.exports = {
  getMyWallet,
  createTopUpOrder,
  verifyTopUp,
  getAllWallets,
  getRevenueStats,
  getOrCreateWallet,
};
