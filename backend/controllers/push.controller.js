const webpush = require('web-push');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Lazy-init VAPID so this module doesn't crash at load time
let vapidConfigured = false;
const ensureVapid = () => {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn('⚠️  VAPID keys not configured. Web Push disabled.');
    return false;
  }
  try {
    webpush.setVapidDetails('mailto:support@sevasarthi.com', pub, priv);
    vapidConfigured = true;
    console.log('🔔 Web Push (VAPID) configured successfully');
    return true;
  } catch (err) {
    console.error('❌ Failed to configure VAPID:', err.message);
    return false;
  }
};

// Subscribe to push notifications
const subscribe = asyncHandler(async (req, res) => {
  if (!ensureVapid()) {
    throw new ApiError(503, 'Push notifications are not configured on this server.');
  }
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    throw new ApiError(400, 'Invalid subscription object');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Add subscription if it doesn't exist
  const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
  if (!exists) {
    user.pushSubscriptions.push(subscription);
    await user.save();
  }

  res.status(201).json(new ApiResponse(201, {}, 'Subscribed to push notifications'));
});

// Helper to send push to a specific user
const sendPushToUser = async (userId, payload) => {
  if (!ensureVapid()) return; // Silently skip if push isn't configured
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

    const invalidSubs = [];
    const notifications = user.pushSubscriptions.map(async (sub, index) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          invalidSubs.push(index);
        }
      }
    });

    await Promise.all(notifications);

    // Clean up expired/invalid subscriptions
    if (invalidSubs.length > 0) {
      user.pushSubscriptions = user.pushSubscriptions.filter((_, i) => !invalidSubs.includes(i));
      await user.save();
    }
  } catch (err) {
    console.error('Push notification error:', err);
  }
};

module.exports = { subscribe, sendPushToUser };
