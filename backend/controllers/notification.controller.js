const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const total = await Notification.countDocuments({ userId: req.user._id });
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.status(200).json(new ApiResponse(200, { notifications, unreadCount, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } }, 'Notifications retrieved.'));
});

const markAsRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.status(200).json(new ApiResponse(200, null, 'Marked as read.'));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read.'));
});

const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.status(200).json(new ApiResponse(200, null, 'All notifications cleared.'));
});

module.exports = { getNotifications, markAsRead, markAllAsRead, clearAll };
