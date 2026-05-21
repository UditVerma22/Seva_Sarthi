const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    // Promotion / Banner specific fields
    isBannerOnly: {
      type: Boolean,
      default: false, // If true, this is just a promotional banner, not a discount code
    },
    title: {
      type: String,
      required: function() { return this.showOnHome; },
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    targetUrl: {
      type: String, // Where the "Book now" button redirects
    },
    showOnHome: {
      type: Boolean,
      default: false,
    },
    userType: {
      type: String,
      enum: ['all', 'new'],
      default: 'all',
    },
    
    // Discount specific fields
    code: {
      type: String,
      required: function() { return !this.isBannerOnly; },
      uppercase: true,
      trim: true,
      unique: true,
      sparse: true, // Allow nulls for banner-only records
    },
    discountType: {
      type: String,
      enum: ['flat', 'percent'],
      required: function() { return !this.isBannerOnly; },
    },
    discountValue: {
      type: Number,
      required: function() { return !this.isBannerOnly; },
      min: [0, 'Discount cannot be negative'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
      default: null, // null means no cap
    },
    maxUses: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Coupon', couponSchema);
