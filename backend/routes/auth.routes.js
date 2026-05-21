const router = require('express').Router();
const { register, login, googleAuth, logout, getMe, changePassword, refreshAccessToken, forgotPassword, verifyOtp, resetPassword, sendProviderOtp, verifyProviderOtp, sendUserOtp, verifyUserOtp } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema, sendUserOtpSchema, verifyUserOtpSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', authLimiter, googleAuth);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/change-password', auth, validate(changePasswordSchema), changePassword);
router.post('/refresh-token', refreshAccessToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// Provider registration OTP
router.post('/provider/send-otp', authLimiter, sendProviderOtp);
router.post('/provider/verify-otp', authLimiter, verifyProviderOtp);

// User signup OTP (email + SMS)
router.post('/user/send-otp', authLimiter, validate(sendUserOtpSchema), sendUserOtp);
router.post('/user/verify-otp', authLimiter, validate(verifyUserOtpSchema), verifyUserOtp);

module.exports = router;
