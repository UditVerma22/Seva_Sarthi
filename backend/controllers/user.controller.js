const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found.');

  res.status(200).json(new ApiResponse(200, { user }, 'Profile retrieved.'));
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone', 'avatar', 'address'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(new ApiResponse(200, { user }, 'Profile updated.'));
});

// @desc    Get user's bookings
// @route   GET /api/users/bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { userId: req.user._id };

  if (status) query.status = status;

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate({ path: 'providerId', select: 'title category userId', populate: { path: 'userId', select: 'name avatar phone' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.status(200).json(
    new ApiResponse(200, {
      bookings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    }, 'Bookings retrieved.')
  );
});

// @desc    Get user's rentals
// @route   GET /api/users/rentals
// @access  Private
const getMyRentals = asyncHandler(async (req, res) => {
  const rentals = await Rental.find({ userId: req.user._id })
    .populate('toolId', 'name image dailyRate')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, { rentals }, 'Rentals retrieved.')
  );
});

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [activeBookings, completedBookings, activeRentals, totalSpent] = await Promise.all([
    Booking.countDocuments({ userId, status: { $nin: ['completed', 'cancelled'] } }),
    Booking.countDocuments({ userId, status: 'completed' }),
    Rental.countDocuments({ userId, status: { $nin: ['returned', 'cancelled'] } }),
    Booking.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      activeBookings,
      completedBookings,
      activeRentals,
      totalSpent: totalSpent[0]?.total || 0,
    }, 'Dashboard stats retrieved.')
  );
});

module.exports = {
  getProfile,
  updateProfile,
  getMyBookings,
  getMyRentals,
  getDashboardStats,
};
