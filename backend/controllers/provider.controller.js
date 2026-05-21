const Provider = require('../models/Provider');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Tool = require('../models/Tool');
const Rental = require('../models/Rental');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { TOOL_STATUS } = require('../utils/constants');

// @desc    List all providers (with filters)
// @route   GET /api/providers
// @access  Public
const getAllProviders = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    city,
    sortBy = 'relevance',
    page = 1,
    limit = 20,
  } = req.query;

  const query = { isAvailable: true, verificationStatus: 'approved' };

  if (category) {
    query.category = category;
  }

  let providers;
  let total;

  if (city) {
    const usersInCity = await User.find({
      role: 'provider',
      'address.city': { $regex: new RegExp(`^${city}$`, 'i') }
    }).select('_id');
    const userIdsInCity = usersInCity.map(u => u._id);

    if (!query.$and) query.$and = [];
    query.$and.push({
      $or: [
        { city: { $regex: new RegExp(`^${city}$`, 'i') } },
        { userId: { $in: userIdsInCity } }
      ]
    });
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    const matchingUsers = await User.find({
      role: 'provider',
      name: searchRegex
    }).select('_id');
    const userIdsSearch = matchingUsers.map(u => u._id);

    if (!query.$and) query.$and = [];
    query.$and.push({
      $or: [
        { title: searchRegex },
        { category: searchRegex },
        { userId: { $in: userIdsSearch } }
      ]
    });
  }

  total = await Provider.countDocuments(query);

  let sortOption = {};
  if (sortBy === 'highestRated') sortOption = { rating: -1 };
  else sortOption = { isTopRated: -1, rating: -1 };

  providers = await Provider.find(query)
    .populate('userId', 'name email avatar phone')
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.status(200).json(
    new ApiResponse(200, {
      providers,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    }, 'Providers retrieved.')
  );
});

// @desc    Get single provider profile
// @route   GET /api/providers/:id
// @access  Public
const getProvider = asyncHandler(async (req, res) => {
  let provider;
  try {
    provider = await Provider.findById(req.params.id).populate('userId', 'name email avatar phone');
  } catch (err) {
    // Ignore cast errors, will try finding by userId below
  }

  if (!provider) {
    try {
      provider = await Provider.findOne({ userId: req.params.id }).populate('userId', 'name email avatar phone');
    } catch (err) {
      // Ignore
    }
  }

  if (!provider) {
    throw new ApiError(404, 'Provider not found.');
  }

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Provider retrieved.')
  );
});

// @desc    Update provider profile (own)
// @route   PUT /api/providers/profile
// @access  Private (Provider)
const updateProviderProfile = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found.');
  }

  const allowedFields = [
    'category', 'title', 'bio', 'skills', 'certifications',
    'portfolio', 'experience', 'pricePerHour', 'isAvailable', 'workingHours'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      provider[field] = req.body[field];
    }
  });

  await provider.save();

  res.status(200).json(
    new ApiResponse(200, { provider }, 'Profile updated.')
  );
});

// @desc    Get pending job requests for provider
// @route   GET /api/providers/requests
// @access  Private (Provider)
const getPendingRequests = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const requests = await Booking.find({
    providerId: provider._id,
    status: 'pending',
  })
    .populate('userId', 'name email avatar phone')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, { requests }, 'Pending requests retrieved.')
  );
});

// @desc    Toggle provider availability
// @route   PUT /api/providers/availability
// @access  Private (Provider)
const toggleAvailability = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const newStatus = !provider.isAvailable;
  provider.isAvailable = newStatus;
  await provider.save();

  // Cascade the availability to all services and tools
  await Promise.all([
    // Update all services
    Service.updateMany(
      { providerId: req.user._id },
      { $set: { isActive: newStatus } }
    ),
    // Update all tools (only toggle available/maintenance, don't touch rented ones)
    Tool.updateMany(
      { 
        ownerId: req.user._id,
        status: { $in: [TOOL_STATUS.AVAILABLE, TOOL_STATUS.MAINTENANCE] }
      },
      { $set: { status: newStatus ? TOOL_STATUS.AVAILABLE : TOOL_STATUS.MAINTENANCE } }
    )
  ]);

  res.status(200).json(
    new ApiResponse(200, { isAvailable: provider.isAvailable }, `Now ${provider.isAvailable ? 'accepting' : 'not accepting'} jobs. All services and tools updated.`)
  );
});

// @desc    Get provider dashboard stats
// @route   GET /api/providers/dashboard
// @access  Private (Provider)
const getDashboardStats = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const providerTools = await Tool.find({ ownerId: req.user._id }).select('_id');
  const toolIds = providerTools.map(t => t._id);

  const [
    todayBookings,
    todayRentals,
    pendingBookingRequests,
    pendingRentalRequests,
    weeklyBookingEarnings,
    weeklyRentalEarnings,
    totalBookingEarningsAgg,
    totalRentalEarningsAgg
  ] = await Promise.all([
    // Today's Bookings
    Booking.countDocuments({
      providerId: provider._id,
      $or: [
        { scheduledDate: { $gte: today, $lt: tomorrow } },
        { status: { $in: ['accepted', 'en_route', 'working'] } },
        { status: 'completed', updatedAt: { $gte: today, $lt: tomorrow } }
      ],
      status: { $nin: ['cancelled'] },
    }),
    // Today's Rentals (Delivery or Return scheduled for today, or active, or finished today)
    Rental.countDocuments({
      toolId: { $in: toolIds },
      $or: [
        { 'deliveryDetails.deliveryDate': { $gte: today, $lt: tomorrow } },
        { status: { $in: ['confirmed', 'delivered'] } },
        { status: 'returned', updatedAt: { $gte: today, $lt: tomorrow } }
      ],
      status: { $nin: ['cancelled'] },
    }),
    // Pending Bookings
    Booking.countDocuments({ providerId: provider._id, status: 'pending' }),
    // Pending Rentals
    Rental.countDocuments({ toolId: { $in: toolIds }, status: 'pending' }),
    // Weekly booking earnings (NET = totalAmount - platformFee)
    Booking.aggregate([
      {
        $match: {
          providerId: provider._id,
          status: 'completed',
          updatedAt: { $gte: weekStart },
        },
      },
      { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] }] } } } },
    ]),
    // Weekly rental earnings
    Rental.aggregate([
      {
        $match: {
          toolId: { $in: toolIds },
          status: 'returned',
          updatedAt: { $gte: weekStart },
        },
      },
      { $group: { _id: null, total: { $sum: { $subtract: ['$total', { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] }] } } } },
    ]),
    // All-time total booking earnings (NET = totalAmount - platformFee)
    Booking.aggregate([
      {
        $match: {
          providerId: provider._id,
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] }] } } } },
    ]),
    // All-time total rental earnings
    Rental.aggregate([
      {
        $match: {
          toolId: { $in: toolIds },
          status: 'returned',
        },
      },
      { $group: { _id: null, total: { $sum: { $subtract: ['$total', { $add: [{ $ifNull: ['$platformFee', 49] }, { $ifNull: ['$tax', 0] }] }] } } } },
    ]),
  ]);

  const todayJobs = todayBookings + todayRentals;
  const pendingRequests = pendingBookingRequests + pendingRentalRequests;
  const weeklyEarnings = (weeklyBookingEarnings[0]?.total || 0) + (weeklyRentalEarnings[0]?.total || 0);
  const totalEarnings = (totalBookingEarningsAgg[0]?.total || 0) + (totalRentalEarningsAgg[0]?.total || 0);


  // Also count completed bookings directly for accuracy
  const totalCompleted = await Booking.countDocuments({
    providerId: provider._id,
    status: 'completed',
  });

  // Count total non-cancelled bookings for accurate completion rate
  const totalBookings = await Booking.countDocuments({
    providerId: provider._id,
    status: { $nin: ['cancelled'] },
  });

  res.status(200).json(
    new ApiResponse(200, {
      isAvailable: provider.isAvailable,
      workingHours: provider.workingHours,
      todayJobs,
      pendingRequests,
      weeklyEarnings,
      totalEarnings,
      rating: provider.rating,
      jobsCompleted: totalCompleted || provider.jobsCompleted || 0,
      completionRate: totalBookings > 0 ? `${Math.round((totalCompleted / totalBookings) * 100)}%` : '0%',
    }, 'Dashboard stats retrieved.')
  );
});

// @desc    Get provider's active jobs (accepted, en_route, working)
// @route   GET /api/providers/schedule
// @access  Private (Provider)
const getTodaySchedule = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const schedule = await Booking.find({
    providerId: provider._id,
    status: { $in: ['accepted', 'en_route', 'working'] },
  })
    .select('-otp -completionOtp')
    .populate('userId', 'name phone')
    .sort({ scheduledDate: 1, scheduledTime: 1 });

  res.status(200).json(
    new ApiResponse(200, { schedule }, 'Schedule retrieved.')
  );
});

// @desc    Get provider earnings
// @route   GET /api/providers/earnings
// @access  Private (Provider)
const getEarnings = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  const { period = 'week' } = req.query;

  let startDate = new Date();
  if (period === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
  else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

  const earnings = await Booking.aggregate([
    {
      $match: {
        providerId: provider._id,
        status: 'completed',
        updatedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalEarnings = earnings.reduce((sum, e) => sum + e.total, 0);

  res.status(200).json(
    new ApiResponse(200, { earnings, totalEarnings, period }, 'Earnings retrieved.')
  );
});

// @desc    Get provider onboarding/verification status
// @route   GET /api/providers/onboarding-status
// @access  Private (Provider)
const getOnboardingStatus = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) throw new ApiError(404, 'Provider profile not found.');

  res.status(200).json(
    new ApiResponse(200, {
      verificationStatus: provider.verificationStatus,
      rejectionReason: provider.rejectionReason || '',
      businessType: provider.businessType,
      businessName: provider.businessName,
      primaryCategory: provider.primaryCategory || provider.category,
      appliedAt: provider.createdAt,
      approvedAt: provider.approvedAt,
    }, 'Onboarding status retrieved.')
  );
});

// @desc    Get provider available slots for a specific date
// @route   GET /api/providers/:id/available-slots
// @access  Public
const getProviderAvailableSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw new ApiError(400, 'Date parameter is required');

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  const isToday = targetDate.getTime() === todayMidnight.getTime();

  let provider;
  try {
    provider = await Provider.findById(req.params.id);
  } catch (err) {}
  if (!provider) {
    try {
      provider = await Provider.findOne({ userId: req.params.id });
    } catch (err) {}
  }
  if (!provider) throw new ApiError(404, 'Provider not found');

  const startHourStr = provider.workingHours?.start || '09:00';
  const endHourStr = provider.workingHours?.end || '18:00';

  const [startH, startM] = startHourStr.split(':').map(Number);
  const [endH, endM] = endHourStr.split(':').map(Number);

  const slotIntervalMinutes = 90; // 1.5 hours

  const slots = [];
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + slotIntervalMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const timeStr = `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    slots.push(timeStr);
    currentMinutes += slotIntervalMinutes;
  }

  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const activeBookings = await Booking.find({
    providerId: provider._id,
    scheduledDate: { $gte: targetDate, $lt: nextDate },
    status: { $nin: ['cancelled'] } 
  });

  const bookedTimes = activeBookings.map(b => b.scheduledTime);

  let blockUntilMinutes = 0;
  if (isToday) {
    const currentlyWorking = await Booking.findOne({
      providerId: provider._id,
      status: 'working'
    });

    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    if (currentlyWorking) {
      // Dynamic Clash Handling: block slots for the next 2 hours if actively working
      blockUntilMinutes = nowMinutes + 120;
    } else {
      // Block past slots with a 1 hour buffer
      blockUntilMinutes = nowMinutes + 60;
    }
  }

  const availableSlots = {
    morning: [],
    afternoon: [],
    evening: []
  };

  slots.forEach(slot => {
    if (bookedTimes.includes(slot)) return;

    let [timeStr, modifier] = slot.split(' ');
    let [h, m] = timeStr.split(':').map(Number);
    if (h === 12) h = 0;
    if (modifier === 'PM') h += 12;
    const slotMins = h * 60 + m;

    if (isToday && slotMins <= blockUntilMinutes) return;

    if (h < 12) availableSlots.morning.push(slot);
    else if (h < 17) availableSlots.afternoon.push(slot);
    else availableSlots.evening.push(slot);
  });

  res.status(200).json(new ApiResponse(200, availableSlots, 'Available slots retrieved'));
});

module.exports = {
  getAllProviders,
  getProvider,
  updateProviderProfile,
  getPendingRequests,
  toggleAvailability,
  getDashboardStats,
  getTodaySchedule,
  getEarnings,
  getOnboardingStatus,
  getProviderAvailableSlots,
};
