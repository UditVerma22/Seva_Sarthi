const Complaint = require('../models/Complaint');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { COMPLAINT_STATUS, COMPLAINT_TYPES, COMPLAINT_CATEGORIES, ADMIN_ACTIONS, NOTIFICATION_TYPES } = require('../utils/constants');

// Helper: create notification + emit socket event
const notifyUser = async (userId, title, message, metadata = {}, io) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type: NOTIFICATION_TYPES.COMPLAINT,
    metadata,
  });
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
    io.to(`user:${userId}`).emit('complaint:status_update', metadata);
  }
  return notification;
};

// ────────────────────────────────────────────────────────
// CUSTOMER ENDPOINTS
// ────────────────────────────────────────────────────────

// @desc    Create a new complaint
// @route   POST /api/complaints
// @access  Private (User)
const createComplaint = asyncHandler(async (req, res) => {
  const { type, bookingId, rentalId, category, description, proofImage } = req.body;
  const userId = req.user._id;

  // Validate type
  if (!Object.values(COMPLAINT_TYPES).includes(type)) {
    throw new ApiError(400, 'Invalid complaint type.');
  }

  // Validate category against type
  const validCategories = COMPLAINT_CATEGORIES[type] || [];
  if (!validCategories.includes(category)) {
    throw new ApiError(400, `Invalid category for ${type}. Valid: ${validCategories.join(', ')}`);
  }

  let providerId = null;
  let referenceLabel = '';

  if (type === COMPLAINT_TYPES.SERVICE_BOOKING) {
    if (!bookingId) throw new ApiError(400, 'Booking ID is required for service complaints.');
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, 'Booking not found.');
    if (booking.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'This booking does not belong to you.');
    }
    providerId = booking.providerId;
    referenceLabel = booking.serviceName || 'Service Booking';

    // Check for existing open complaint on this booking
    const existing = await Complaint.findOne({
      bookingId,
      userId,
      status: { $in: [COMPLAINT_STATUS.PENDING, COMPLAINT_STATUS.IN_REVIEW, COMPLAINT_STATUS.REOPENED] },
    });
    if (existing) {
      throw new ApiError(409, `You already have an open complaint (${existing.ticketId}) for this booking.`);
    }
  } else if (type === COMPLAINT_TYPES.TOOL_RENTAL) {
    if (!rentalId) throw new ApiError(400, 'Rental ID is required for tool rental complaints.');
    const rental = await Rental.findById(rentalId).populate('toolId');
    if (!rental) throw new ApiError(404, 'Rental not found.');
    if (rental.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'This rental does not belong to you.');
    }
    // Find provider via tool owner
    if (rental.toolId) {
      const tool = rental.toolId;
      if (tool.ownerId) {
        const provider = await Provider.findOne({ userId: tool.ownerId });
        providerId = provider ? provider._id : null;
      }
    }
    referenceLabel = rental.toolName || 'Tool Rental';

    // Check for existing open complaint on this rental
    const existing = await Complaint.findOne({
      rentalId,
      userId,
      status: { $in: [COMPLAINT_STATUS.PENDING, COMPLAINT_STATUS.IN_REVIEW, COMPLAINT_STATUS.REOPENED] },
    });
    if (existing) {
      throw new ApiError(409, `You already have an open complaint (${existing.ticketId}) for this rental.`);
    }
  }

  const complaint = await Complaint.create({
    userId,
    type,
    bookingId: type === COMPLAINT_TYPES.SERVICE_BOOKING ? bookingId : null,
    rentalId: type === COMPLAINT_TYPES.TOOL_RENTAL ? rentalId : null,
    providerId,
    category,
    description,
    proofImage: proofImage || '',
    statusHistory: [{ status: COMPLAINT_STATUS.PENDING, note: 'Complaint submitted by customer.' }],
  });

  // Notify user
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    await notifyUser(userId, 'Complaint Submitted', `Your complaint ${complaint.ticketId} for "${referenceLabel}" has been submitted.`, {
      complaintId: complaint._id,
      ticketId: complaint.ticketId,
      status: complaint.status,
    }, io);
  } catch (err) {
    console.error('Socket notification error:', err.message);
  }

  res.status(201).json(new ApiResponse(201, { complaint }, 'Complaint submitted successfully.'));
});

// @desc    Get current user's complaints
// @route   GET /api/complaints/my
// @access  Private (User)
const getMyComplaints = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 10 } = req.query;
  const query = { userId: req.user._id };

  if (status) query.status = status;
  if (type) query.type = type;

  const total = await Complaint.countDocuments(query);
  const complaints = await Complaint.find(query)
    .populate('bookingId', 'serviceName scheduledDate totalAmount status')
    .populate('rentalId', 'toolName days total status')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name email' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.status(200).json(new ApiResponse(200, {
    complaints,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
  }, 'Complaints retrieved.'));
});

// @desc    Get single complaint detail
// @route   GET /api/complaints/:id
// @access  Private (User — own only)
const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('userId', 'name email avatar')
    .populate('bookingId', 'serviceName scheduledDate totalAmount status providerId')
    .populate('rentalId', 'toolName days total status toolId')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name email avatar' } });

  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  // Users can only see their own; admins can see all
  if (req.user.role !== 'admin' && complaint.userId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied.');
  }

  res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint details retrieved.'));
});

// @desc    Reopen a resolved/rejected complaint
// @route   PUT /api/complaints/:id/reopen
// @access  Private (User)
const reopenComplaint = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.');
  if (complaint.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied.');
  }
  if (![COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.REJECTED].includes(complaint.status)) {
    throw new ApiError(400, 'Only resolved or rejected complaints can be reopened.');
  }
  if (complaint.reopenCount >= 3) {
    throw new ApiError(400, 'Maximum reopen limit (3) reached. Please contact support directly.');
  }

  complaint.status = COMPLAINT_STATUS.REOPENED;
  complaint.reopenCount += 1;
  complaint.reopenReason = reason || 'Customer reopened the complaint.';
  complaint.resolvedAt = null;
  complaint.statusHistory.push({
    status: COMPLAINT_STATUS.REOPENED,
    note: reason || 'Reopened by customer.',
    changedBy: req.user._id,
  });
  await complaint.save();

  // Notify
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    await notifyUser(req.user._id, 'Complaint Reopened', `Your complaint ${complaint.ticketId} has been reopened.`, {
      complaintId: complaint._id,
      ticketId: complaint.ticketId,
      status: complaint.status,
    }, io);
  } catch (err) {
    console.error('Socket notification error:', err.message);
  }

  res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint reopened.'));
});

// ────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ────────────────────────────────────────────────────────

// @desc    Get all complaints (admin)
// @route   GET /api/admin/complaints
// @access  Private (Admin)
const getAllComplaints = asyncHandler(async (req, res) => {
  const { status, type, search, page = 1, limit = 10 } = req.query;
  const query = {};

  if (status) query.status = status;
  if (type) query.type = type;
  if (search) {
    const r = new RegExp(search, 'i');
    query.$or = [
      { ticketId: r },
      { category: r },
      { description: r },
    ];
  }

  const total = await Complaint.countDocuments(query);
  const complaints = await Complaint.find(query)
    .populate('userId', 'name email avatar')
    .populate('bookingId', 'serviceName scheduledDate totalAmount status')
    .populate('rentalId', 'toolName days total status')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name email' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Stats
  const [pendingCount, inReviewCount, resolvedCount, escalatedCount] = await Promise.all([
    Complaint.countDocuments({ status: COMPLAINT_STATUS.PENDING }),
    Complaint.countDocuments({ status: COMPLAINT_STATUS.IN_REVIEW }),
    Complaint.countDocuments({ status: COMPLAINT_STATUS.RESOLVED }),
    Complaint.countDocuments({ status: COMPLAINT_STATUS.ESCALATED }),
  ]);

  res.status(200).json(new ApiResponse(200, {
    complaints,
    stats: { pendingCount, inReviewCount, resolvedCount, escalatedCount, totalCount: total },
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
  }, 'All complaints retrieved.'));
});

// @desc    Get single complaint (admin)
// @route   GET /api/admin/complaints/:id
// @access  Private (Admin)
const getAdminComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('userId', 'name email avatar phone')
    .populate('bookingId')
    .populate({ path: 'rentalId', populate: { path: 'toolId', select: 'name image category' } })
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name email avatar phone' } });

  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint detail retrieved.'));
});

// @desc    Update complaint status (admin)
// @route   PUT /api/admin/complaints/:id/status
// @access  Private (Admin)
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, adminResponse } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  if (!Object.values(COMPLAINT_STATUS).includes(status)) {
    throw new ApiError(400, 'Invalid complaint status.');
  }

  complaint.status = status;
  if (adminResponse) complaint.adminResponse = adminResponse;
  if (status === COMPLAINT_STATUS.RESOLVED) complaint.resolvedAt = new Date();

  complaint.statusHistory.push({
    status,
    note: adminResponse || `Status updated to ${status} by admin.`,
    changedBy: req.user._id,
  });
  await complaint.save();

  // Notify customer
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    const statusLabel = status.replace('_', ' ').toUpperCase();
    await notifyUser(complaint.userId, 'Complaint Updated', `Your complaint ${complaint.ticketId} status has been updated to ${statusLabel}.${adminResponse ? ` Admin: "${adminResponse}"` : ''}`, {
      complaintId: complaint._id,
      ticketId: complaint.ticketId,
      status: complaint.status,
    }, io);
  } catch (err) {
    console.error('Socket notification error:', err.message);
  }

  res.status(200).json(new ApiResponse(200, { complaint }, 'Complaint status updated.'));
});

// @desc    Take admin action on a complaint (against the provider)
// @route   PUT /api/admin/complaints/:id/action
// @access  Private (Admin)
const takeAdminAction = asyncHandler(async (req, res) => {
  const { action, details } = req.body;
  const complaint = await Complaint.findById(req.params.id).populate('providerId');
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  if (!Object.values(ADMIN_ACTIONS).includes(action)) {
    throw new ApiError(400, 'Invalid admin action.');
  }

  if (!complaint.providerId) {
    throw new ApiError(400, 'No provider associated with this complaint.');
  }

  const provider = await Provider.findById(complaint.providerId._id || complaint.providerId);
  if (!provider) throw new ApiError(404, 'Provider not found.');

  const providerUser = await User.findById(provider.userId);
  let actionNote = '';
  const actionDetails = { action, ...details };

  switch (action) {
    case ADMIN_ACTIONS.WARNING_ISSUED: {
      const reason = details?.reason || complaint.category;
      provider.warnings.push({
        reason,
        issuedAt: new Date(),
        complaintId: complaint._id,
      });
      actionNote = `Warning issued to provider: ${reason}`;
      break;
    }

    case ADMIN_ACTIONS.TRUST_SCORE_REDUCED: {
      const amount = details?.amount || 15;
      provider.trustScore = Math.max(0, provider.trustScore - amount);
      actionDetails.previousScore = provider.trustScore + amount;
      actionDetails.newScore = provider.trustScore;
      actionNote = `Trust score reduced by ${amount} (now ${provider.trustScore})`;
      break;
    }

    case ADMIN_ACTIONS.TEMPORARY_SUSPENSION: {
      const days = details?.days || 7;
      provider.isSuspended = true;
      provider.suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      provider.isAvailable = false;
      actionNote = `Provider suspended for ${days} days (until ${provider.suspendedUntil.toLocaleDateString()})`;
      break;
    }

    case ADMIN_ACTIONS.PERMANENT_BAN: {
      provider.isSuspended = true;
      provider.isAvailable = false;
      if (providerUser) {
        providerUser.isActive = false;
        await providerUser.save({ validateBeforeSave: false });
      }
      actionNote = 'Provider permanently banned.';
      break;
    }

    case ADMIN_ACTIONS.REFUND_INITIATED: {
      const refundAmount = details?.amount || 0;
      actionDetails.refundAmount = refundAmount;
      actionNote = `Refund of ₹${refundAmount} initiated for the customer.`;
      break;
    }

    case ADMIN_ACTIONS.FREE_RESERVICE: {
      actionNote = 'Free re-service has been assigned to the customer.';
      break;
    }

    case ADMIN_ACTIONS.PENALTY_APPLIED: {
      const penaltyAmount = details?.amount || 0;
      provider.penalties.push({
        amount: penaltyAmount,
        reason: details?.reason || complaint.category,
        appliedAt: new Date(),
        complaintId: complaint._id,
      });
      actionNote = `Penalty of ₹${penaltyAmount} applied to provider.`;
      break;
    }

    default:
      throw new ApiError(400, 'Unknown action.');
  }

  await provider.save();

  // Update complaint record
  complaint.adminAction = action;
  complaint.actionDetails = actionDetails;
  complaint.statusHistory.push({
    status: complaint.status,
    note: actionNote,
    changedBy: req.user._id,
  });
  await complaint.save();

  // Notify provider
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (provider.userId) {
      await notifyUser(provider.userId, 'Admin Action Taken', actionNote, {
        complaintId: complaint._id,
        ticketId: complaint.ticketId,
        action,
      }, io);
    }
    // Also notify customer
    await notifyUser(complaint.userId, 'Action Taken on Complaint', `An admin action has been taken on your complaint ${complaint.ticketId}: ${actionNote}`, {
      complaintId: complaint._id,
      ticketId: complaint.ticketId,
      action,
    }, io);
  } catch (err) {
    console.error('Socket notification error:', err.message);
  }

  res.status(200).json(new ApiResponse(200, { complaint, provider }, `Action "${action}" applied successfully. ${actionNote}`));
});

// @desc    Get user's bookings and rentals for complaint form
// @route   GET /api/complaints/references
// @access  Private (User)
const getComplaintReferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [bookings, rentals] = await Promise.all([
    Booking.find({ userId })
      .populate({ path: 'providerId', populate: { path: 'userId', select: 'name' } })
      .select('serviceName scheduledDate totalAmount status providerId')
      .sort({ createdAt: -1 })
      .limit(50),
    Rental.find({ userId })
      .populate({ path: 'toolId', select: 'name image' })
      .select('toolName days total status toolId')
      .sort({ createdAt: -1 })
      .limit(50),
  ]);

  res.status(200).json(new ApiResponse(200, { bookings, rentals }, 'References retrieved.'));
});

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  reopenComplaint,
  getAllComplaints,
  getAdminComplaintById,
  updateComplaintStatus,
  takeAdminAction,
  getComplaintReferences,
};
