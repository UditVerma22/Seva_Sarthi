const Joi = require('joi');

// Strict email pattern - must have valid domain with proper TLD
const strictEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password pattern - min 6, max 15
const passwordSchema = Joi.string().min(6).max(14).required().messages({
  'string.min': 'Password must be at least 6 characters',
  'string.max': 'Password cannot exceed 14 characters',
  'any.required': 'Password is required',
});

const registerSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().pattern(strictEmailPattern).allow('').optional().messages({
      'string.pattern.base': 'Please enter a valid email address (e.g. name@gmail.com)',
    }),
    password: passwordSchema,
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).allow('').optional().messages({
      'string.pattern.base': 'Enter a valid 10-digit Indian mobile number starting with 6-9',
    }),
    role: Joi.string().valid('user', 'provider').default('user'),
    // Signup verification
    signupMethod: Joi.string().valid('email', 'phone').optional(),
    otpToken: Joi.string().optional(),
    // User address fields
    address: Joi.object({
      line1: Joi.string().min(5).allow('').messages({
        'string.min': 'Address must be at least 5 characters',
      }),
      line2: Joi.string().allow(''),
      city: Joi.string().min(2).allow('').messages({
        'string.min': 'City name must be at least 2 characters',
      }),
      pincode: Joi.string().pattern(/^[1-8]\d{5}$/).allow('').messages({
        'string.pattern.base': 'Enter a valid 6-digit Indian pincode',
      }),
      landmark: Joi.string().allow(''),
    }).optional(),
    // Provider-specific fields (optional, only used when role=provider)
    category: Joi.string().optional(),
    title: Joi.string().optional(),
    bio: Joi.string().max(1000).allow('').optional(),
    skills: Joi.array().items(Joi.string()).optional(),
    experience: Joi.string().optional(),
    // New onboarding fields
    businessType: Joi.string().valid('individual', 'shop', 'agency').optional(),
    businessName: Joi.string().allow('').optional(),
    ownerName: Joi.string().allow('').optional(),
    fullAddress: Joi.string().allow('').optional(),
    city: Joi.string().allow('').optional(),
    pincode: Joi.string().allow('').optional(),
    primaryCategory: Joi.string().allow('').optional(),
    documents: Joi.object({
      idProof: Joi.string().allow(''),
      idProofType: Joi.string().valid('aadhar', 'pan', '').allow(''),
      profilePhoto: Joi.string().allow(''),
      businessLicense: Joi.string().allow(''),
      gst: Joi.string().allow(''),
    }).optional(),
  }).custom((value, helpers) => {
    // At least one of email or phone must be provided
    if (!value.email && !value.phone) {
      return helpers.error('any.custom', { message: 'Either email or mobile number is required' });
    }
    return value;
  }),
};


const loginSchema = {
  body: Joi.object({
    email: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    identifier: Joi.string().optional(), // Can be email or phone
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }).custom((value, helpers) => {
    // At least one identifier must be provided
    if (!value.email && !value.phone && !value.identifier) {
      return helpers.error('any.custom', { message: 'Email or mobile number is required' });
    }
    return value;
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(6).max(14).required().messages({
      'string.min': 'New password must be at least 6 characters',
      'string.max': 'New password cannot exceed 14 characters',
      'any.required': 'New password is required',
    }),
  }),
};

const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    identifier: Joi.string().optional(), // Can be email or phone
  }).custom((value, helpers) => {
    if (!value.email && !value.phone && !value.identifier) {
      return helpers.error('any.custom', { message: 'Email or mobile number is required' });
    }
    return value;
  }),
};

const verifyOtpSchema = {
  body: Joi.object({
    email: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    identifier: Joi.string().optional(),
    otp: Joi.string().length(6).required().messages({
      'string.length': 'OTP must be 6 digits',
      'any.required': 'OTP is required',
    }),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    email: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    identifier: Joi.string().optional(),
    resetToken: Joi.string().required(),
    newPassword: Joi.string().min(6).max(14).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 14 characters',
    }),
  }),
};

// User signup OTP schemas
const sendUserOtpSchema = {
  body: Joi.object({
    type: Joi.string().valid('email', 'phone').required().messages({
      'any.required': 'OTP type is required (email or phone)',
      'any.only': 'OTP type must be "email" or "phone"',
    }),
    email: Joi.string().pattern(strictEmailPattern).allow('').optional().messages({
      'string.pattern.base': 'Please enter a valid email address',
    }),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).allow('').optional().messages({
      'string.pattern.base': 'Enter a valid 10-digit mobile number',
    }),
  }).custom((value, helpers) => {
    if (value.type === 'email' && !value.email) {
      return helpers.error('any.custom', { message: 'Email is required for email OTP' });
    }
    if (value.type === 'phone' && !value.phone) {
      return helpers.error('any.custom', { message: 'Mobile number is required for phone OTP' });
    }
    return value;
  }),
};

const verifyUserOtpSchema = {
  body: Joi.object({
    type: Joi.string().valid('email', 'phone').required(),
    email: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    otp: Joi.string().length(6).required().messages({
      'string.length': 'OTP must be 6 digits',
      'any.required': 'OTP is required',
    }),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  sendUserOtpSchema,
  verifyUserOtpSchema,
};
