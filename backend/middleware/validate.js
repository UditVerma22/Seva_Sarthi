const ApiError = require('../utils/ApiError');

/**
 * Middleware factory for Joi schema validation.
 * @param {object} schema - Joi schema object with body, params, query keys
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationErrors = [];

    ['body', 'params', 'query'].forEach((key) => {
      if (schema[key]) {
        const { error } = schema[key].validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          error.details.forEach((detail) => {
            validationErrors.push({
              field: detail.path.join('.'),
              message: detail.message.replace(/"/g, ''),
            });
          });
        }
      }
    });

    if (validationErrors.length > 0) {
      throw new ApiError(422, 'Validation failed', validationErrors);
    }

    next();
  };
};

module.exports = { validate };
