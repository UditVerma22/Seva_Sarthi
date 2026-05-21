const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');
const { sendPushToUser } = require('../controllers/push.controller');

/**
 * Create a notification and push it via WebSocket in real-time.
 */
const createAndPushNotification = async ({ userId, title, message, type = 'system', metadata = {} }) => {
  try {
    // Save to database
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      metadata,
    });

    // Send OS level Push Notification if subscribed
    try {
      await sendPushToUser(userId, {
        title,
        body: message,
        data: metadata
      });
    } catch (err) {
      console.error('Error sending Web Push:', err.message);
    }

    // Push via WebSocket
    try {
      const io = getIO();
      
      // Send the notification to user's private room
      io.to(`user:${userId}`).emit('notification:new', {
        id: notification._id,
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        time: 'Just now',
        createdAt: notification.createdAt,
      });

      // Send updated unread count
      const unreadCount = await Notification.countDocuments({ userId, read: false });
      io.to(`user:${userId}`).emit('notification:count', { count: unreadCount });
    } catch {
      // Socket.IO might not be initialized yet (during seeding, etc.)
    }

    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error.message);
    return null;
  }
};

/**
 * Emit a booking status update via WebSocket.
 * Sends to BOTH the booking room AND the user's private room
 * so dashboards always receive updates.
 */
const emitBookingUpdate = (bookingId, data, userId, providerUserId) => {
  try {
    const io = getIO();
    const payload = { ...data, bookingId };
    
    // Emit to booking-specific room (for anyone who joined it)
    io.to(`booking:${bookingId}`).emit('booking:status_update', payload);
    
    // Also emit directly to the user's private room
    if (userId) {
      io.to(`user:${userId}`).emit('booking:status_update', payload);
    }
    
    // Also emit to the provider's private room
    if (providerUserId) {
      io.to(`user:${providerUserId}`).emit('booking:status_update', payload);
    }
  } catch {
    // Socket not initialized
  }
};

/**
 * Emit a new job request to a provider via WebSocket.
 * Sends the full booking data so the provider dashboard can display it immediately.
 */
const emitNewJobRequest = (providerUserId, jobData) => {
  try {
    const io = getIO();
    io.to(`user:${providerUserId}`).emit('booking:new_request', jobData);
  } catch {
    // Socket not initialized
  }
};

/**
 * Emit OTP securely to a specific user via their private socket room.
 * This ensures the provider cannot intercept the code.
 */
const emitOtpToUser = (userId, data) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('booking:otp_update', data);
  } catch {
    // Socket not initialized
  }
};

module.exports = {
  createAndPushNotification,
  emitBookingUpdate,
  emitNewJobRequest,
  emitOtpToUser,
};
