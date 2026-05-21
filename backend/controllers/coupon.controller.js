const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a coupon or promotional banner
// @route   POST /api/coupons
// @access  Private (Admin)
const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json(new ApiResponse(201, coupon, 'Coupon created successfully'));
});

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/admin
// @access  Private (Admin)
const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.status(200).json(new ApiResponse(200, coupons, 'Coupons fetched successfully'));
});

// @desc    Update a coupon
// @route   PUT /api/coupons/:id
// @access  Private (Admin)
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.status(200).json(new ApiResponse(200, coupon, 'Coupon updated successfully'));
});

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.status(200).json(new ApiResponse(200, null, 'Coupon deleted successfully'));
});

// @desc    Get promotional banners for the home page
// @route   GET /api/coupons/home
// @access  Public
const getHomeOffers = asyncHandler(async (req, res) => {
  const offers = await Coupon.find({ showOnHome: true, isActive: true })
    .select('title subtitle imageUrl targetUrl isBannerOnly code userType')
    .sort('-createdAt');
  res.status(200).json(new ApiResponse(200, offers, 'Home offers fetched'));
});

// @desc    Get eligible coupons for a user during checkout
// @route   GET /api/coupons/eligible
// @access  Private (User)
const getEligibleCoupons = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Check if user is new (has no previous completed/active bookings)
  const previousBookings = await Booking.countDocuments({ userId: userId });
  const isNewUser = previousBookings === 0;

  const query = {
    isActive: true,
    isBannerOnly: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };

  if (!isNewUser) {
    // If not a new user, only show 'all' userType coupons
    query.userType = 'all';
  }

  const coupons = await Coupon.find(query).select('-__v');
  res.status(200).json(new ApiResponse(200, coupons, 'Eligible coupons fetched'));
});

// @desc    Validate a coupon code during checkout
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount = 0 } = req.body;
  if (!code) throw new ApiError(400, 'Coupon code is required.');

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true, isBannerOnly: false });
  if (!coupon) throw new ApiError(404, 'Invalid or expired coupon code.');

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw new ApiError(400, 'This coupon has expired.');
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new ApiError(400, 'This coupon has reached its usage limit.');
  }
  if (orderAmount < coupon.minOrderAmount) {
    throw new ApiError(400, `Minimum order amount of ₹${coupon.minOrderAmount} required.`);
  }

  // Check userType constraints
  if (coupon.userType === 'new') {
    const previousBookings = await Booking.countDocuments({ userId: req.user._id });
    if (previousBookings > 0) {
      throw new ApiError(400, 'This coupon is only valid for first-time users.');
    }
  }

  let discount = 0;
  if (coupon.discountType === 'flat') discount = coupon.discountValue;
  else if (coupon.discountType === 'percent') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  }

  res.status(200).json(new ApiResponse(200, {
    _id: coupon._id,
    code: coupon.code, 
    discountType: coupon.discountType,
    discountValue: coupon.discountValue, 
    discount: Math.round(discount),
    description: coupon.description,
  }, 'Coupon is valid.'));
});

module.exports = {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getHomeOffers,
  getEligibleCoupons,
  validateCoupon
};
