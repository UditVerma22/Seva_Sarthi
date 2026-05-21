const mongoose = require('mongoose');
const { RENTAL_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const deliveryDetailsSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String, default: '' },
    deliveryDate: { type: Date, required: true },
    deliveryWindow: { type: String, default: '10:00 - 12:00' },
    idType: { type: String, default: 'Aadhaar' },
    idNumber: { type: String, required: true },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const rentalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tool',
      required: true,
    },
    toolName: {
      type: String,
      required: true,
    },
    days: {
      type: Number,
      required: [true, 'Rental duration is required'],
      min: [1, 'Minimum 1 day rental'],
      max: [30, 'Maximum 30 day rental'],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 99,
    },
    tax: {
      type: Number,
      default: 0,
    },
    refundableDeposit: {
      type: Number,
      default: 500,
    },
    total: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      default: 49,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash_on_delivery'],
      default: 'online',
    },
    deliveryDetails: deliveryDetailsSchema,
    status: {
      type: String,
      enum: Object.values(RENTAL_STATUS),
      default: RENTAL_STATUS.PENDING,
    },
    deliveryOtp: {
      type: String,
      default: '',
    },
    returnOtp: {
      type: String,
      default: '',
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

rentalSchema.index({ userId: 1, status: 1 });
rentalSchema.index({ toolId: 1 });

module.exports = mongoose.model('Rental', rentalSchema);
