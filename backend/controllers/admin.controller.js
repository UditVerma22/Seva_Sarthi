const User = require('../models/User');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Tool = require('../models/Tool');
const Rental = require('../models/Rental');
const Service = require('../models/Service');
const Review = require('../models/Review');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, totalProviders, activeBookings, completedBookings, newProviders, grossRevenueResult, platformFeeResult, totalTools, totalServices, rentalGrossResult, rentalPlatformFeeResult] = await Promise.all([
    User.countDocuments({ isActive: true, role: 'user' }),
    User.countDocuments({ isActive: true, role: 'provider' }),
    Booking.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
    Booking.countDocuments({ status: 'completed' }),
    Provider.countDocuments({ verificationStatus: 'pending' }),
    // Gross transaction volume (total user spend)
    Booking.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    // Platform revenue = sum of all platformFees + taxes from completed bookings
    Booking.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] } } } }]),
    Tool.countDocuments(),
    Service.countDocuments({ isActive: true }),
    // Gross from Rentals
    Rental.aggregate([{ $match: { status: 'returned' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    // Platform revenue from Rentals
    Rental.aggregate([{ $match: { status: 'returned' } }, { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] } } } }])
  ]);

  // Monthly platform revenue
  const monthlyPlatformFee = await Booking.aggregate([
    { $match: { status: 'completed', updatedAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] } } } },
  ]);

  // Monthly gross
  const monthlyGross = await Booking.aggregate([
    { $match: { status: 'completed', updatedAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  const monthlyRentalPlatformFee = await Rental.aggregate([
    { $match: { status: 'returned', updatedAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] } } } },
  ]);

  const monthlyRentalGross = await Rental.aggregate([
    { $match: { status: 'returned', updatedAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  res.status(200).json(new ApiResponse(200, {
    totalUsers,
    totalProviders,
    activeBookings,
    completedBookings,
    newProviders,
    // Platform revenue (what platform actually earns = sum of platformFees + tax)
    revenue: (platformFeeResult[0]?.total || 0) + (rentalPlatformFeeResult?.[0]?.total || 0),
    monthlyRevenue: (monthlyPlatformFee[0]?.total || 0) + (monthlyRentalPlatformFee[0]?.total || 0),
    // Gross transaction volume (for reference)
    grossVolume: (grossRevenueResult[0]?.total || 0) + (rentalGrossResult?.[0]?.total || 0),
    monthlyGrossVolume: (monthlyGross[0]?.total || 0) + (monthlyRentalGross[0]?.total || 0),
    totalTools,
    totalServices,
  }, 'Stats retrieved.'));
});


// @desc    Get all users with search, filter, pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, status, page = 1, limit = 10 } = req.query;
  const query = {};
  if (role) query.role = role;
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;
  if (search) {
    const r = new RegExp(search, 'i');
    query.$or = [{ name: r }, { email: r }];
  }
  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.status(200).json(new ApiResponse(200, { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }, 'Users retrieved.'));
});

// @desc    Toggle user active status (ban/unban)
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private (Admin)
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role === 'admin') throw new ApiError(400, 'Cannot modify admin status.');

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}.`));
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role === 'admin') throw new ApiError(400, 'Cannot delete admin user.');

  // Also delete provider profile if exists
  if (user.role === 'provider') {
    await Provider.deleteOne({ userId: user._id });
  }
  await user.deleteOne();

  res.status(200).json(new ApiResponse(200, null, 'User deleted.'));
});

// @desc    Get provider verifications queue (with status filter)
// @route   GET /api/admin/verifications
// @access  Private (Admin)
const getVerifications = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const query = {};
  if (status && status !== 'all') query.verificationStatus = status;
  else if (!status) query.verificationStatus = 'pending';

  const providers = await Provider.find(query)
    .populate('userId', 'name email avatar phone createdAt')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, { verifications: providers }, 'Verifications retrieved.'));
});

// @desc    Approve/reject provider verification
// @route   PUT /api/admin/verifications/:id
// @access  Private (Admin)
const handleVerification = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const provider = await Provider.findById(req.params.id);
  if (!provider) throw new ApiError(404, 'Provider not found.');

  if (action === 'approve') {
    provider.verificationStatus = 'approved';
    provider.isVerifiedProvider = true;
    provider.approvedAt = new Date();
    provider.rejectionReason = '';
    await provider.save();
  } else if (action === 'reject') {
    provider.verificationStatus = 'rejected';
    provider.isVerifiedProvider = false;
    provider.rejectionReason = reason || 'Application does not meet our requirements.';
    await provider.save();
  } else {
    throw new ApiError(400, 'Action must be approve or reject.');
  }
  res.status(200).json(new ApiResponse(200, null, `Provider ${action}d.`));
});

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private (Admin)
const getAllBookings = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const query = {};
  if (status) query.status = status;

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate('userId', 'name email')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name email' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.status(200).json(new ApiResponse(200, { bookings, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }, 'Bookings retrieved.'));
});

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private (Admin)
const getAnalytics = asyncHandler(async (req, res) => {
  // Get last 7 days booking data
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const [bookingCount, revenueResult] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: date, $lt: nextDay } }),
      Booking.aggregate([
        { $match: { status: 'completed', updatedAt: { $gte: date, $lt: nextDay } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    days.push({
      day: dayNames[date.getDay()],
      date: date.toISOString().split('T')[0],
      bookings: bookingCount,
      revenue: revenueResult[0]?.total || 0,
    });
  }

  res.status(200).json(new ApiResponse(200, { analytics: days }, 'Analytics retrieved.'));
});

// @desc    Get all services
// @route   GET /api/admin/services
// @access  Private (Admin)
const getAllServices = asyncHandler(async (req, res) => {
  const services = await Service.find().sort({ category: 1 });
  res.status(200).json(new ApiResponse(200, { services }, 'Services retrieved.'));
});

// @desc    Create/update service
// @route   POST /api/admin/services
// @access  Private (Admin)
const createService = asyncHandler(async (req, res) => {
  const { name, category, description, icon, basePrice } = req.body;
  const service = await Service.create({ name, category, description, icon, basePrice, approvalStatus: 'approved' });
  res.status(201).json(new ApiResponse(201, { service }, 'Service created.'));
});

// @desc    Delete service
// @route   DELETE /api/admin/services/:id
// @access  Private (Admin)
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');
  res.status(200).json(new ApiResponse(200, null, 'Service deleted.'));
});

// @desc    Get pending services for approval
// @route   GET /api/admin/pending-services
// @access  Private (Admin)
const getPendingServices = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const query = {};
  if (status && status !== 'all') query.approvalStatus = status;

  const services = await Service.find(query)
    .populate('providerId', 'name email avatar')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, { services }, 'Pending services retrieved.'));
});

// @desc    Approve a service
// @route   PUT /api/admin/services/:id/approve
// @access  Private (Admin)
const approveService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');
  service.approvalStatus = 'approved';
  service.rejectionReason = '';
  await service.save();
  res.status(200).json(new ApiResponse(200, { service }, 'Service approved.'));
});

// @desc    Reject a service
// @route   PUT /api/admin/services/:id/reject
// @access  Private (Admin)
const rejectService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, 'Service not found.');
  const { reason } = req.body;
  service.approvalStatus = 'rejected';
  service.rejectionReason = reason || 'Does not meet platform guidelines.';
  await service.save();
  res.status(200).json(new ApiResponse(200, { service }, 'Service rejected.'));
});

module.exports = { getStats, getAllUsers, toggleUserStatus, deleteUser, getVerifications, handleVerification, getAllBookings, getAnalytics, getAllServices, createService, deleteService, getPendingServices, approveService, rejectService };

