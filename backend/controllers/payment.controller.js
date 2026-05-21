const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const Tool = require('../models/Tool');
const Provider = require('../models/Provider');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { BOOKING_STATUS, TOOL_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const {
  createAndPushNotification,
  emitBookingUpdate,
  emitNewJobRequest,
  emitOtpToUser,
} = require('../services/notification.service');
const { getIO } = require('../config/socket');

// Lazy-initialize Razorpay instance (ensures env vars are loaded)
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

// @desc    Create a Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { amount, type, metadata } = req.body;

  if (!amount || amount <= 0) {
    throw new ApiError(400, 'Invalid payment amount.');
  }

  if (!['booking', 'rental'].includes(type)) {
    throw new ApiError(400, 'Invalid payment type. Must be "booking" or "rental".');
  }

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: `${type}_${Date.now()}_${req.user._id.toString().slice(-6)}`,
    notes: {
      type,
      userId: req.user._id.toString(),
      ...(metadata || {}),
    },
  };

  const order = await getRazorpay().orders.create(options);

  res.status(201).json(
    new ApiResponse(201, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    }, 'Razorpay order created.')
  );
});

// Helper: resolve provider userId string from a booking
const getProviderUserId = async (providerId) => {
  try {
    const provider = await Provider.findById(providerId).select('userId');
    return provider?.userId?.toString() || null;
  } catch { return null; }
};

// @desc    Verify Razorpay payment and create booking/rental
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    type,       // 'booking' or 'rental'
    payload,    // booking or rental creation data
  } = req.body;

  // 1. Verify the payment signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new ApiError(400, 'Payment verification failed. Invalid signature.');
  }

  // 2. Based on type, create the record
  if (type === 'booking') {
    const result = await createBookingAfterPayment(req, payload, razorpay_order_id, razorpay_payment_id);
    return res.status(201).json(
      new ApiResponse(201, { booking: result }, 'Payment verified. Booking created successfully.')
    );
  }

  if (type === 'rental') {
    const result = await createRentalAfterPayment(req, payload, razorpay_order_id, razorpay_payment_id);
    return res.status(201).json(
      new ApiResponse(201, { rental: result }, 'Payment verified. Rental created successfully.')
    );
  }

  throw new ApiError(400, 'Invalid payment type.');
});

// ── Create Booking after successful payment ──────────────────────────
const createBookingAfterPayment = async (req, payload, razorpayOrderId, razorpayPaymentId) => {
  const {
    providerId, serviceId, serviceName,
    scheduledDate, scheduledTime, address, instructions,
    photos,
    paymentMethod, couponCode,
    baseRate, platformFee, discount, tax, totalAmount,
  } = payload;

  if (photos && Array.isArray(photos) && photos.length > 3) {
    throw new ApiError(400, 'You can upload a maximum of 3 photos.');
  }

  // Verify provider exists
  let provider;
  try {
    provider = await Provider.findById(providerId).populate('userId', 'name');
  } catch (err) { /* ignore cast errors */ }

  if (!provider) {
    try {
      provider = await Provider.findOne({ userId: providerId }).populate('userId', 'name');
    } catch (err) { /* ignore */ }
  }

  if (!provider) throw new ApiError(404, 'Provider not found.');

  const trueProviderId = provider._id;

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
    platformFee: platformFee || 49,
    discount: discount || 0,
    tax: tax || 0,
    totalAmount,
    paymentStatus: PAYMENT_STATUS.PAID,
    razorpayOrderId,
    razorpayPaymentId,
    trackingSteps: [
      { status: BOOKING_STATUS.PENDING, timestamp: new Date(), note: 'Booking created (Payment verified)' },
    ],
  });

  // Re-fetch the full booking with populated fields
  const fullBooking = await Booking.findById(booking._id)
    .populate('userId', 'name email avatar phone');

  // Notify provider of new request
  if (provider.userId) {
    const providerUserIdStr = provider.userId._id?.toString() || provider.userId.toString();

    await createAndPushNotification({
      userId: providerUserIdStr,
      title: 'New Booking Request',
      message: `${req.user.name} has requested ${serviceName || 'a service'} on ${new Date(scheduledDate).toLocaleDateString()}.`,
      type: 'booking',
      metadata: { bookingId: booking._id },
    });

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
    message: `Your booking for ${serviceName || 'service'} has been placed. Payment of ₹${totalAmount} received.`,
    type: 'booking',
    metadata: { bookingId: booking._id },
  });

  return booking;
};

// ── Create Rental after successful payment ──────────────────────────
const createRentalAfterPayment = async (req, payload, razorpayOrderId, razorpayPaymentId) => {
  const { toolId, days, deliveryDetails } = payload;
  const tool = await Tool.findById(toolId);
  if (!tool) throw new ApiError(404, 'Tool not found.');
  if (tool.status !== TOOL_STATUS.AVAILABLE) throw new ApiError(400, 'Tool is not available for rent.');

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const subtotal = tool.dailyRate * days;
  const deliveryFee = 99;
  const tax = Math.round(subtotal * 0.05);
  const refundableDeposit = Math.max(500, Math.round(subtotal * 0.4));
  const total = subtotal + deliveryFee + tax;

  const rental = await Rental.create({
    userId: req.user._id,
    toolId,
    toolName: tool.name,
    days,
    subtotal,
    deliveryFee,
    tax,
    refundableDeposit,
    total,
    deliveryDetails,
    status: 'confirmed',
    deliveryOtp: generateOTP(),
    returnOtp: generateOTP(),
    paymentStatus: PAYMENT_STATUS.PAID,
    razorpayOrderId,
    razorpayPaymentId,
  });

  tool.status = TOOL_STATUS.RENTED;
  await tool.save();

  await createAndPushNotification({
    userId: req.user._id,
    title: 'Rental Confirmed',
    message: `Your rental for ${tool.name} (${days} days) has been confirmed. Payment of ₹${total} received.`,
    type: 'rental',
    metadata: { rentalId: rental._id },
  });

  // Notify tool owner (provider)
  await createAndPushNotification({
    userId: tool.ownerId.toString(),
    title: 'New Tool Rental',
    message: `${req.user.name} has rented your "${tool.name}" for ${days} days. Payment of ₹${total} received.`,
    type: 'rental',
    metadata: { rentalId: rental._id },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${req.user._id.toString()}`).emit('new_rental', rental);
    io.to(`user:${tool.ownerId.toString()}`).emit('new_rental', rental);
  }

  return rental;
};

// @desc    Get Razorpay key for frontend
// @route   GET /api/payments/key
// @access  Public
const getKey = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { keyId: process.env.RAZORPAY_KEY_ID }, 'Razorpay key retrieved.')
  );
});

module.exports = { createOrder, verifyPayment, getKey };
