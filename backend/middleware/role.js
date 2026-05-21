const ApiError = require('../utils/ApiError');

/**
 * Middleware factory to restrict routes to specific roles.
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'provider')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Role '${req.user.role}' is not authorized for this resource.`
      );
    }

    next();
  };
};

module.exports = { authorize };
