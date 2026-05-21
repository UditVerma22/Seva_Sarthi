const Joi = require('joi');

const createRentalSchema = {
  body: Joi.object({
    toolId: Joi.string().required().messages({
      'any.required': 'Tool ID is required',
    }),
    days: Joi.number().integer().min(1).max(30).required().messages({
      'any.required': 'Rental duration is required',
      'number.min': 'Minimum 1 day rental',
      'number.max': 'Maximum 30 day rental',
    }),
    deliveryDetails: Joi.object({
      fullName: Joi.string().required(),
      phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
        'string.pattern.base': 'Enter a valid 10-digit mobile number',
      }),
      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().allow('').optional(),
      city: Joi.string().required(),
      pincode: Joi.string().pattern(/^\d{6}$/).required().messages({
        'string.pattern.base': 'Enter a valid 6-digit PIN code',
      }),
      landmark: Joi.string().allow('').optional(),
      deliveryDate: Joi.date().iso().required(),
      deliveryWindow: Joi.string().default('10:00 - 12:00'),
      idType: Joi.string().valid('Aadhaar', 'PAN', 'Driving License', 'Passport').default('Aadhaar'),
      idNumber: Joi.string().required(),
      notes: Joi.string().allow('').optional(),
    }).required(),
  }),
};

module.exports = {
  createRentalSchema,
};
