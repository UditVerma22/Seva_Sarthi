const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { chatWithAI, analyzeImage } = require('../services/ai.service');
const Booking = require('../models/Booking');

// ── POST /api/ai/chat ─────────────────────────────────────────────
// Handles chat messages with optional user context
const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ApiError(400, 'Message is required.');
  }

  if (message.trim().length > 1000) {
    throw new ApiError(400, 'Message too long. Please keep it under 1000 characters.');
  }

  // Build user context if authenticated
  let userContext = null;
  if (req.user) {
    const bookingCount = await Booking.countDocuments({ userId: req.user._id });
    userContext = {
      name: req.user.name,
      role: req.user.role,
      hasBookings: bookingCount > 0,
    };
  }

  // Validate history format
  const validHistory = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            h &&
            typeof h.role === 'string' &&
            typeof h.content === 'string' &&
            ['user', 'model'].includes(h.role)
        )
        .slice(-10) // Keep last 10 messages
    : [];

  const result = await chatWithAI(message.trim(), validHistory, userContext);

  res.json({
    success: true,
    data: {
      response: result.response,
      actions: result.actions || [],
    },
  });
});

// ── POST /api/ai/analyze-image ────────────────────────────────────
// Handles image analysis for issue detection
const analyzeIssueImage = asyncHandler(async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image || typeof image !== 'string') {
    throw new ApiError(400, 'Image data (base64) is required.');
  }

  // Basic validation for base64 string size (max ~10MB)
  if (image.length > 10 * 1024 * 1024) {
    throw new ApiError(400, 'Image too large. Please use an image under 10MB.');
  }

  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const finalMimeType = validMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

  const result = await analyzeImage(image, finalMimeType);

  if (!result.success) {
    throw new ApiError(500, result.error || 'Image analysis failed.');
  }

  res.json({
    success: true,
    data: result,
  });
});

// ── POST /api/ai/extract-intent ───────────────────────────────────
// Extracts category and search keywords from natural language
const extractIntent = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new ApiError(400, 'Search query is required.');
  }

  if (query.trim().length > 200) {
    throw new ApiError(400, 'Query too long. Please keep it under 200 characters.');
  }

  const { extractSearchIntent } = require('../services/ai.service');
  const result = await extractSearchIntent(query.trim());

  if (!result.success) {
    throw new ApiError(500, result.error || 'Intent extraction failed.');
  }

  res.json({
    success: true,
    data: result,
  });
});

module.exports = {
  chat,
  analyzeIssueImage,
  extractIntent,
};
