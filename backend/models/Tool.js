const mongoose = require('mongoose');
const { TOOL_STATUS, TOOL_CATEGORIES } = require('../utils/constants');

const toolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tool name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: TOOL_CATEGORIES,
      required: [true, 'Category is required'],
    },
    condition: {
      type: String,
      enum: ['Like New', 'Good', 'Fair'],
      default: 'Good',
    },
    dailyRate: {
      type: Number,
      required: [true, 'Daily rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    image: {
      type: String,
      default: '',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TOOL_STATUS),
      default: TOOL_STATUS.AVAILABLE,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    distance: {
      type: String,
      default: '0km',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [77.5946, 12.9716],
      },
    },
  },
  {
    timestamps: true,
  }
);

toolSchema.index({ category: 1, status: 1 });
toolSchema.index({ ownerId: 1 });
toolSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Tool', toolSchema);
