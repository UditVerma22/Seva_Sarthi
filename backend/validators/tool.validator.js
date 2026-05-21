const Joi = require('joi');

const createToolSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'any.required': 'Tool name is required',
    }),
    description: Joi.string().max(500).allow('').optional(),
    category: Joi.string()
      .valid('Power Tools', 'Hand Tools', 'Construction', 'Gardening')
      .required()
      .messages({ 'any.required': 'Category is required' }),
    condition: Joi.string().valid('Like New', 'Good', 'Fair').default('Good'),
    dailyRate: Joi.number().min(50).required().messages({
      'any.required': 'Daily rate is required',
      'number.min': 'Minimum rate is ₹50/day',
    }),
    image: Joi.string().uri().allow('').optional(),
  }),
};

const updateToolSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow('').optional(),
    category: Joi.string().valid('Power Tools', 'Hand Tools', 'Construction', 'Gardening').optional(),
    condition: Joi.string().valid('Like New', 'Good', 'Fair').optional(),
    dailyRate: Joi.number().min(50).optional(),
    image: Joi.string().uri().allow('').optional(),
    status: Joi.string().valid('available', 'rented', 'maintenance').optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

module.exports = {
  createToolSchema,
  updateToolSchema,
};
