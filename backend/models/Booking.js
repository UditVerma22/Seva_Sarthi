const mongoose = require('mongoose');
const { BOOKING_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } = require('../utils/constants');

const trackingStepSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    serviceName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    scheduledTime: {
      type: String,
      required: [true, 'Scheduled time is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    instructions: {
      type: String,
      default: '',
    },
    photos: [{
      type: String,
    }],
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.ONLINE,
    },
    couponCode: {
      type: String,
      default: '',
    },
    baseRate: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 49,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
    },
    trackingSteps: [trackingStepSchema],
    isProviderInactive: {
      type: Boolean,
      default: false,
    },
    reassignedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
    },
    otp: {
      type: String,
      default: '',
    },
    completionOtp: {
      type: String,
      default: '',
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ providerId: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
