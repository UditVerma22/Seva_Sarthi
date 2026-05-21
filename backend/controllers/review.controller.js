const Review = require('../models/Review');
const Provider = require('../models/Provider');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const Booking = require('../models/Booking');

const createReview = asyncHandler(async (req, res) => {
  const { providerId, bookingId, rating, comment } = req.body;
  const provider = await Provider.findById(providerId);
  if (!provider) throw new ApiError(404, 'Provider not found.');

  // Verify that the specific booking is completed
  const completedBooking = await Booking.findOne({
    _id: bookingId,
    userId: req.user._id,
    status: 'completed'
  });
  
  if (!completedBooking) {
    throw new ApiError(403, 'You can only review a job after it is completed.');
  }

  const existing = await Review.findOne({ bookingId });
  if (existing) throw new ApiError(409, 'You have already reviewed this job.');

  const review = await Review.create({
    userId: req.user._id, providerId, bookingId, rating, comment: comment || '',
  });

  await Booking.findByIdAndUpdate(bookingId, { isReviewed: true });

  // Update provider rating
  provider.ratingBreakdown[rating] = (provider.ratingBreakdown[rating] || 0) + 1;
  provider.reviewCount += 1;
  const totalStars = [5,4,3,2,1].reduce((s, star) => s + star * (provider.ratingBreakdown[star] || 0), 0);
  provider.rating = Math.round((totalStars / provider.reviewCount) * 10) / 10;
  provider.isTopRated = provider.rating >= 4.8 && provider.reviewCount >= 10;
  await provider.save();

  res.status(201).json(new ApiResponse(201, { review }, 'Review submitted.'));
});

const getProviderReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const total = await Review.countDocuments({ providerId: req.params.id });
  const reviews = await Review.find({ providerId: req.params.id })
    .populate('userId', 'name avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(parseInt(limit));
  res.status(200).json(new ApiResponse(200, { reviews, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }, 'Reviews retrieved.'));
});

module.exports = { createReview, getProviderReviews };
