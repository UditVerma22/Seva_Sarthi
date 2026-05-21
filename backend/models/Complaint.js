const mongoose = require('mongoose');
const { COMPLAINT_STATUS, COMPLAINT_TYPES, COMPLAINT_CATEGORIES, ADMIN_ACTIONS } = require('../utils/constants');

const allCategories = [
  ...COMPLAINT_CATEGORIES.service_booking,
  ...COMPLAINT_CATEGORIES.tool_rental,
];

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
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
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    // Ticket number (auto-generated)
    ticketId: {
      type: String,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(COMPLAINT_TYPES),
      required: [true, 'Complaint type is required'],
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      default: null,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    category: {
      type: String,
      enum: allCategories,
      required: [true, 'Complaint category is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    proofImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.PENDING,
    },
    adminResponse: {
      type: String,
      default: '',
    },
    adminAction: {
      type: String,
      enum: [...Object.values(ADMIN_ACTIONS), ''],
      default: '',
    },
    actionDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    statusHistory: [statusHistorySchema],
    reopenCount: {
      type: Number,
      default: 0,
      max: 3,
    },
    reopenReason: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate ticket ID before saving
complaintSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const count = await mongoose.model('Complaint').countDocuments();
    this.ticketId = `SS-CMP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Indexes
complaintSchema.index({ userId: 1, status: 1 });
complaintSchema.index({ providerId: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
