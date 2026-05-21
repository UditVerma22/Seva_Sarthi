const Joi = require('joi');

const createBookingSchema = {
  body: Joi.object({
    providerId: Joi.string().required().messages({
      'any.required': 'Provider ID is required',
    }),
    serviceId: Joi.string().optional(),
    serviceName: Joi.string().optional(),
    scheduledDate: Joi.date().iso().required().messages({
      'any.required': 'Scheduled date is required',
    }),
    scheduledTime: Joi.string().required().messages({
      'any.required': 'Scheduled time is required',
    }),
    address: Joi.string().min(5).required().messages({
      'any.required': 'Address is required',
      'string.min': 'Address must be at least 5 characters',
    }),
    instructions: Joi.string().max(500).allow('').optional(),
    photos: Joi.array().items(Joi.string()).max(3).optional(),
    paymentMethod: Joi.string().valid('online', 'cash_after_service').default('online'),
    couponCode: Joi.string().allow('').optional(),
    baseRate: Joi.number().min(0).required(),
    platformFee: Joi.number().min(0).default(49),
    discount: Joi.number().min(0).default(0),
    tax: Joi.number().min(0).default(0),
    totalAmount: Joi.number().min(0).required(),
  }),
};

const updateBookingStatusSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid('pending', 'accepted', 'en_route', 'working', 'completed', 'cancelled')
      .required()
      .messages({ 'any.required': 'Status is required' }),
    note: Joi.string().max(200).allow('').optional(),
    otp: Joi.string().max(10).allow('').optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

module.exports = {
  createBookingSchema,
  updateBookingStatusSchema,
};
