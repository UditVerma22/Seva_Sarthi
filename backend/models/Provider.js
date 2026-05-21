const mongoose = require('mongoose');
const { BUSINESS_TYPES, PROVIDER_STATUS } = require('../utils/constants');

const providerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ── Business / Onboarding Fields ─────────────────────
    businessType: {
      type: String,
      enum: Object.values(BUSINESS_TYPES),
      default: BUSINESS_TYPES.INDIVIDUAL,
    },
    businessName: {
      type: String,
      default: '',
      trim: true,
    },
    ownerName: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    fullAddress: {
      type: String,
      default: '',
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Primary Service Category (selected during onboarding) ──
    primaryCategory: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Verification / Approval ──────────────────────────
    verificationStatus: {
      type: String,
      enum: Object.values(PROVIDER_STATUS),
      default: PROVIDER_STATUS.PENDING,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    documents: {
      idProof: { type: String, default: '' },
      idProofType: { type: String, enum: ['aadhar', 'pan', ''], default: '' },
      profilePhoto: { type: String, default: '' },
      businessLicense: { type: String, default: '' },
      gst: { type: String, default: '' },
    },

    // ── Legacy / Professional Fields (backward compat) ───
    category: {
      type: String,
      default: 'Home Maintenance',
      trim: true,
    },
    title: {
      type: String,
      default: 'Service Professional',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    skills: [{ type: String, trim: true }],
    certifications: [
      {
        title: { type: String, required: true },
        issuer: { type: String, default: '' },
      },
    ],
    portfolio: [
      {
        image: { type: String, required: true },
        label: { type: String, default: '' },
      },
    ],
    experience: {
      type: String,
      default: '1 yr',
    },
    pricePerHour: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },

    // ── Ratings & Stats ──────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingBreakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    jobsCompleted: {
      type: Number,
      default: 0,
    },
    badges: [{ type: String, trim: true }],
    isTopRated: {
      type: Boolean,
      default: false,
    },

    // ── Availability ─────────────────────────────────────
    isAvailable: {
      type: Boolean,
      default: true,
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
    },

    // ── Verification (legacy, kept for compat) ───────────
    isVerifiedProvider: {
      type: Boolean,
      default: false,
    },
    verificationDocs: [{ type: String }],

    // ── Location ─────────────────────────────────────────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716], // Default: Bengaluru
      },
    },

    // ── Complaint Action Fields ──────────────────────────
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    warnings: [
      {
        reason: { type: String, required: true },
        issuedAt: { type: Date, default: Date.now },
        complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
      },
    ],
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },
    penalties: [
      {
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        appliedAt: { type: Date, default: Date.now },
        complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
providerSchema.index({ location: '2dsphere' });
// Index for filtering
providerSchema.index({ category: 1, isAvailable: 1, rating: -1 });
// Index for verification status
providerSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('Provider', providerSchema);
