const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const ProviderWallet = require('../models/ProviderWallet');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { BOOKING_STATUS, PAYMENT_METHODS } = require('../utils/constants');
const { getOrCreateWallet } = require('./wallet.controller');
const {
  createAndPushNotification,
  emitBookingUpdate,
  emitNewJobRequest,
  emitOtpToUser,
} = require('../services/notification.service');

// Helper: resolve provider userId string from a booking
const getProviderUserId = async (providerId) => {
  try {
    const provider = await Provider.findById(providerId).select('userId');
    return provider?.userId?.toString() || null;
  } catch { return null; }
};

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private (User)
const createBooking = asyncHandler(async (req, res) => {
  const {
    providerId, serviceId, serviceName,
    scheduledDate, scheduledTime, address, instructions,
    photos,
    paymentMethod, couponCode,
    baseRate, platformFee, discount, tax, totalAmount,
  } = req.body;

  if (photos && Array.isArray(photos) && photos.length > 3) {
    throw new ApiError(400, 'You can upload a maximum of 3 photos.');
  }

  // Verify provider exists
  let provider;
  try {
    provider = await Provider.findById(providerId).populate('userId', 'name');
  } catch (err) {
    // Ignore cast errors
  }
  
  if (!provider) {
    try {
      provider = await Provider.findOne({ userId: providerId }).populate('userId', 'name');
    } catch (err) {}
  }

  if (!provider) throw new ApiError(404, 'Provider not found.');
  
  // Re-assign providerId to the true Provider._id for the booking record
  const trueProviderId = provider._id;

  // ── Wallet check for COD bookings ──────────────────────
  const fee = platformFee || 49;
  const bookingTax = tax || 0;
  const totalDeduction = fee + bookingTax;
  if (paymentMethod === PAYMENT_METHODS.CASH || paymentMethod === 'cash_after_service') {
    const wallet = await getOrCreateWallet(trueProviderId);
    if (wallet.balance < totalDeduction) {
      throw new ApiError(
        400,
        `Provider's wallet balance (₹${wallet.balance}) is insufficient to cover the platform fee + tax (₹${totalDeduction}). Provider must top up their wallet to accept Cash on Delivery bookings.`
      );
    }
  }

  const booking = await Booking.create({
    userId: req.user._id,
    providerId: trueProviderId,
    serviceId,
    serviceName: serviceName || '',
    scheduledDate,
    scheduledTime,
    address,
    instructions: instructions || '',
    photos: photos || [],
    paymentMethod: paymentMethod || 'online',
    couponCode: couponCode || '',
    baseRate,
    platformFee: fee,
    discount: discount || 0,
    tax: tax || 0,
    totalAmount,
    trackingSteps: [
      { status: BOOKING_STATUS.PENDING, timestamp: new Date(), note: 'Booking created' },
    ],
  });

  // Re-fetch the full booking with populated fields for the socket events
  const fullBooking = await Booking.findById(booking._id)
    .populate('userId', 'name email avatar phone');

  // Notify provider of new request — send the FULL booking object
  if (provider.userId) {
    const providerUserIdStr = provider.userId._id?.toString() || provider.userId.toString();

    await createAndPushNotification({
      userId: providerUserIdStr,
      title: 'New Booking Request',
      message: `${req.user.name} has requested ${serviceName || 'a service'} on ${new Date(scheduledDate).toLocaleDateString()}.`,
      type: 'booking',
      metadata: { bookingId: booking._id },
    });

    // Send full booking data so provider dashboard can render it immediately
    emitNewJobRequest(providerUserIdStr, {
      _id: fullBooking._id,
      userId: fullBooking.userId,
      serviceName: fullBooking.serviceName,
      scheduledDate: fullBooking.scheduledDate,
      scheduledTime: fullBooking.scheduledTime,
      address: fullBooking.address,
      totalAmount: fullBooking.totalAmount,
      status: fullBooking.status,
      location: fullBooking.address,
    });
  }

  // Notify user
  await createAndPushNotification({
    userId: req.user._id,
    title: 'Booking Confirmed',
    message: `Your booking for ${serviceName || 'service'} has been placed successfully.`,
    type: 'booking',
    metadata: { bookingId: booking._id },
  });

  res.status(201).json(
    new ApiResponse(201, { booking }, 'Booking created successfully.')
  );
});

// @desc    Get booking details
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'name email phone avatar')
    .populate({
      path: 'providerId',
      select: 'title category rating',
      populate: { path: 'userId', select: 'name avatar' },
    });

  if (!booking) throw new ApiError(404, 'Booking not found.');

  // Only the user, provider, or admin can view
  const isOwner = booking.userId._id.toString() === req.user._id.toString();
  const provider = await Provider.findOne({ userId: req.user._id });
  const isProvider = provider && booking.providerId._id.toString() === provider._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isProvider && !isAdmin) {
    throw new ApiError(403, 'Not authorized to view this booking.');
  }

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking retrieved.')
  );
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Provider/Admin)
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, note, otp } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');

  // Time-Fencing: Prevent starting or completing a future booking today
  const restrictedStatuses = [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.WORKING, BOOKING_STATUS.COMPLETED];
  if (restrictedStatuses.includes(status)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(booking.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);

    if (today < scheduled) {
      throw new ApiError(400, `You cannot mark this booking as '${status.replace('_', ' ')}' before its scheduled date.`);
    }
  }

  if (status === BOOKING_STATUS.WORKING) {
    if (!otp || otp !== booking.otp) {
      throw new ApiError(400, 'Invalid Start Code. Please ask the customer for the correct 4-digit code.');
    }
  }

  if (status === BOOKING_STATUS.COMPLETED) {
    if (!otp || otp !== booking.completionOtp) {
      throw new ApiError(400, 'Invalid Completion Code. Please ask the customer for the correct 4-digit code.');
    }
  }

  // Update status and add tracking step
  booking.status = status;
  booking.trackingSteps.push({
    status,
    timestamp: new Date(),
    note: note || '',
  });

  // If working, generate completion OTP and send to user
  if (status === BOOKING_STATUS.WORKING) {
    booking.completionOtp = Math.floor(1000 + Math.random() * 9000).toString();
  }

  // If completed, increment provider stats AND process wallet transaction
  if (status === BOOKING_STATUS.COMPLETED) {
    await Provider.findByIdAndUpdate(booking.providerId, {
      $inc: { jobsCompleted: 1 },
    });

    // ── Wallet credit/debit on completion ──────────────────
    try {
      const wallet = await getOrCreateWallet(booking.providerId);
      const fee = booking.platformFee || 49;
      const tax = booking.tax || 0;
      const totalDeductions = fee + tax;
      const bookingRef = booking._id.toString().slice(-6).toUpperCase();

      if (booking.paymentMethod === 'online') {
        // Online: platform already collected full amount → credit provider's net share
        const providerShare = booking.totalAmount - totalDeductions;
        if (providerShare > 0) {
          wallet.credit(
            providerShare,
            `Earnings — Online booking #${bookingRef} (₹${booking.totalAmount} - ₹${fee} fee - ₹${tax} tax)`,
            'online_earning',
            { bookingId: booking._id }
          );
        }
      } else {
        // COD: provider already collected cash → debit platform fee + tax from wallet
        wallet.debit(
          totalDeductions,
          `Platform fee + Tax — COD booking #${bookingRef} (₹${fee} fee + ₹${tax} tax)`,
          'cod_fee',
          { bookingId: booking._id }
        );
      }

      await wallet.save();
    } catch (walletErr) {
      console.error('Wallet transaction error:', walletErr.message);
      // Don't block booking completion if wallet fails — log and continue
    }
  }

  await booking.save();

  // Resolve provider userId for socket emission
  const providerUserId = await getProviderUserId(booking.providerId);

  // Real-time update — emit to booking room, user room, AND provider room
  emitBookingUpdate(booking._id.toString(), {
    bookingId: booking._id,
    status,
    timestamp: new Date(),
    note,
  }, booking.userId.toString(), providerUserId);

  // Send completion OTP to user securely when work starts
  if (status === BOOKING_STATUS.WORKING) {
    emitOtpToUser(booking.userId.toString(), {
      bookingId: booking._id.toString(),
      completionOtp: booking.completionOtp,
    });
  }

  // Notify user
  const statusMessages = {
    accepted: 'Your booking has been accepted by the provider.',
    en_route: 'Provider is on the way to your location.',
    working: 'Provider has started working on your service.',
    completed: 'Service completed! Please rate your experience.',
    cancelled: 'Your booking has been cancelled.',
  };

  await createAndPushNotification({
    userId: booking.userId,
    title: `Booking ${status.replace('_', ' ').toUpperCase()}`,
    message: statusMessages[status] || `Booking status updated to ${status}.`,
    type: 'booking',
    metadata: { bookingId: booking._id, status },
  });

  res.status(200).json(
    new ApiResponse(200, { booking }, `Booking status updated to ${status}.`)
  );
});

// @desc    Provider accepts a job
// @route   POST /api/bookings/:id/accept
// @access  Private (Provider)
const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');

  if (booking.status !== BOOKING_STATUS.PENDING) {
    throw new ApiError(400, 'This booking is no longer pending.');
  }

  booking.status = BOOKING_STATUS.ACCEPTED;
  booking.otp = Math.floor(1000 + Math.random() * 9000).toString();
  booking.trackingSteps.push({
    status: BOOKING_STATUS.ACCEPTED,
    timestamp: new Date(),
    note: 'Job accepted by provider',
  });
  await booking.save();

  // Resolve provider userId for socket emission
  const providerUserId = await getProviderUserId(booking.providerId);

  // Emit status update to user room AND provider room
  emitBookingUpdate(booking._id.toString(), {
    bookingId: booking._id,
    status: BOOKING_STATUS.ACCEPTED,
    timestamp: new Date(),
  }, booking.userId.toString(), providerUserId);

  // Send start OTP to user securely via their private room
  emitOtpToUser(booking.userId.toString(), {
    bookingId: booking._id.toString(),
    otp: booking.otp,
  });

  await createAndPushNotification({
    userId: booking.userId,
    title: 'Booking Accepted',
    message: 'Great news! Your service provider has accepted the job.',
    type: 'booking',
    metadata: { bookingId: booking._id },
  });

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking accepted.')
  );
});

// @desc    Provider declines a job
// @route   POST /api/bookings/:id/decline
// @access  Private (Provider)
const declineBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');

  if (booking.status !== BOOKING_STATUS.PENDING) {
    throw new ApiError(400, 'This booking is no longer pending.');
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.trackingSteps.push({
    status: BOOKING_STATUS.CANCELLED,
    timestamp: new Date(),
    note: 'Job declined by provider',
  });
  await booking.save();

  // Resolve provider userId for socket emission
  const providerUserId = await getProviderUserId(booking.providerId);

  // Emit status update to user room
  emitBookingUpdate(booking._id.toString(), {
    bookingId: booking._id,
    status: BOOKING_STATUS.CANCELLED,
    timestamp: new Date(),
  }, booking.userId.toString(), providerUserId);

  await createAndPushNotification({
    userId: booking.userId,
    title: 'Booking Declined',
    message: 'Your provider has declined the booking. Please try another professional.',
    type: 'booking',
    metadata: { bookingId: booking._id },
  });

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking declined.')
  );
});

// @desc    Reassign provider for a booking
// @route   PUT /api/bookings/:id/reassign
// @access  Private (User/Admin)
const reassignProvider = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');

  // Find another available provider in the same category
  const currentProvider = await Provider.findById(booking.providerId);
  const newProvider = await Provider.findOne({
    _id: { $ne: booking.providerId },
    category: currentProvider?.category || 'Home Maintenance',
    isAvailable: true,
  }).sort({ rating: -1 });

  if (!newProvider) {
    throw new ApiError(404, 'No other available providers found.');
  }

  booking.reassignedFrom = booking.providerId;
  booking.providerId = newProvider._id;
  booking.isProviderInactive = false;
  booking.status = BOOKING_STATUS.ACCEPTED;
  booking.trackingSteps.push({
    status: BOOKING_STATUS.ACCEPTED,
    timestamp: new Date(),
    note: `Reassigned to new provider`,
  });
  await booking.save();

  // Notify new provider
  await createAndPushNotification({
    userId: newProvider.userId,
    title: 'Reassigned Job',
    message: 'A job has been reassigned to you. Please check your pending requests.',
    type: 'booking',
    metadata: { bookingId: booking._id },
  });

  const populatedBooking = await Booking.findById(booking._id).populate({
    path: 'providerId',
    populate: { path: 'userId', select: 'name' },
  });

  res.status(200).json(
    new ApiResponse(200, { booking: populatedBooking }, 'Provider reassigned successfully.')
  );
});

// @desc    Get booking tracking steps
// @route   GET /api/bookings/:id/tracking
// @access  Private
const getBookingTracking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).select('status trackingSteps');
  if (!booking) throw new ApiError(404, 'Booking not found.');

  res.status(200).json(
    new ApiResponse(200, {
      status: booking.status,
      trackingSteps: booking.trackingSteps,
    }, 'Tracking info retrieved.')
  );
});

module.exports = {
  createBooking,
  getBooking,
  updateBookingStatus,
  acceptBooking,
  declineBooking,
  reassignProvider,
  getBookingTracking,
};
