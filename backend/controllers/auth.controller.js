const User = require('../models/User');
const Provider = require('../models/Provider');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let transporter = null;
let transporterMode = 'uninitialized';

const getTransporter = async () => {
  // If we have a working transporter, return it
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  // --- Option 1: Full SMTP_HOST config ---
  if (process.env.SMTP_HOST && smtpUser && smtpPass) {
    try {
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await t.verify();
      transporter = t;
      transporterMode = 'smtp-host';
      console.log('✅ Email transporter ready (SMTP host)');
      return transporter;
    } catch (err) {
      console.error('❌ SMTP_HOST connection failed:', err.message);
      transporter = null; // reset so next request retries
    }
  }

  // --- Option 2: Service config (e.g. Gmail) ---
  if (smtpUser && smtpPass && smtpUser !== 'your_gmail@gmail.com') {
    try {
      const t = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await t.verify();
      transporter = t;
      transporterMode = 'smtp-service';
      console.log(`✅ Email transporter ready (${process.env.SMTP_SERVICE || 'gmail'})`);
      return transporter;
    } catch (err) {
      console.error('❌ SMTP service connection failed:', err.message);
      console.error('   Make sure you are using a Gmail App Password (not your regular Gmail password).');
      console.error('   Get one at: https://myaccount.google.com/apppasswords');
      transporter = null; // reset so next request retries
    }
  }

  // --- Option 3: Ethereal (fake SMTP for development) ---
  // Creates a temporary test account. OTP will appear in console as a preview URL.
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    transporterMode = 'ethereal-dev';
    console.log('📧 Using Ethereal test email (dev mode). OTP preview links will appear in console.');
    return transporter;
  } catch (err) {
    console.error('❌ Could not create Ethereal test account:', err.message);
  }

  transporterMode = 'no-email';
  return null;
};


// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, address, signupMethod, otpToken } = req.body;

  // Check for existing user by email or phone
  if (email) {
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) throw new ApiError(409, 'An account with this email already exists.');
  }
  if (phone) {
    const existingByPhone = await User.findOne({ phone });
    if (existingByPhone) throw new ApiError(409, 'An account with this mobile number already exists.');
  }

  // For user signup (not provider), verify token
  if (role !== 'provider' && signupMethod) {
    if (signupMethod === 'email') {
      const stored = global._userOtpStore?.[email];
      if (!stored || !stored.verified) {
        throw new ApiError(400, 'Please verify your email first.');
      }
      if (otpToken !== stored.verifyToken) {
        throw new ApiError(400, 'Invalid verification. Please verify again.');
      }
      // Cleanup
      delete global._userOtpStore[email];
    } else if (signupMethod === 'phone') {
      const stored = global._userOtpStore?.[phone];
      if (!stored || !stored.verified) {
        throw new ApiError(400, 'Please verify your phone number first.');
      }
      if (otpToken !== stored.verifyToken) {
        throw new ApiError(400, 'Invalid verification. Please verify again.');
      }
      // Cleanup
      delete global._userOtpStore[phone];
    }
  }

  let dashboard = '/user/dashboard';
  if (role === 'provider') dashboard = '/provider/dashboard';
  if (role === 'admin') dashboard = '/admin/dashboard';

  const user = await User.create({
    name, email, password,
    phone: phone || '',
    role: role || 'user',
    dashboard,
    address: address || {},
  });

  // If provider, create provider profile with onboarding fields
  if (role === 'provider') {
    const {
      category, title, bio, skills, experience,
      businessType, businessName, fullAddress, city, pincode,
      primaryCategory, documents,
    } = req.body;

    // Auto-generate business name for individuals
    let finalBusinessName = businessName || '';
    if ((!finalBusinessName || finalBusinessName.trim() === '') && (!businessType || businessType === 'individual')) {
      const cat = primaryCategory || category || 'Service';
      finalBusinessName = `${name} ${cat} Services`;
    }

    await Provider.create({
      userId: user._id,
      ownerName: name,
      phone: phone || '',
      businessType: businessType || 'individual',
      businessName: finalBusinessName,
      category: primaryCategory || category || 'Home Maintenance',
      primaryCategory: primaryCategory || category || 'Home Maintenance',
      title: title || 'Service Professional',
      bio: bio || '',
      skills: skills || [],
      experience: experience || '1 yr',
      city: city || '',
      fullAddress: fullAddress || '',
      pincode: pincode || '',
      documents: documents || {},
      verificationStatus: 'pending',
    });

    // Also update user address with provider city/pincode if no address provided
    if (!address && (city || pincode)) {
      user.address = { city: city || '', pincode: pincode || '' };
      await user.save({ validateBeforeSave: false });
    }
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  res.cookie('accessToken', accessToken, cookieOptions);

  // For providers, include verification status
  let providerStatus = null;
  if (role === 'provider') {
    providerStatus = 'pending';
  }

  res.status(201).json(
    new ApiResponse(201, {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      providerStatus,
    }, role === 'provider' ? 'Application submitted! Your account is pending review.' : 'Registration successful.')
  );
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, phone, identifier, password } = req.body;

  // Support login via email, phone, or generic identifier
  let loginId = email || phone || identifier || '';
  loginId = loginId.trim();

  if (!loginId) throw new ApiError(400, 'Email or mobile number is required.');

  // Detect if it's a phone number or email
  const isPhone = /^[6-9]\d{9}$/.test(loginId.replace(/[\s\-+()]/g, '').replace(/^(\+?91)/, ''));
  let cleanedPhone = loginId.replace(/[\s\-+()]/g, '');
  if (cleanedPhone.startsWith('+91')) cleanedPhone = cleanedPhone.slice(3);
  else if (cleanedPhone.startsWith('91') && cleanedPhone.length > 10) cleanedPhone = cleanedPhone.slice(2);

  let user;
  if (isPhone) {
    user = await User.findOne({ phone: cleanedPhone }).select('+password');
  } else {
    user = await User.findOne({ email: loginId.toLowerCase() }).select('+password');
  }
  if (!user) throw new ApiError(401, 'Invalid credentials. No account found with this ' + (isPhone ? 'mobile number' : 'email') + '.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials.');

  if (!user.isActive) {
    throw new ApiError(403, 'Account has been deactivated. Contact support.');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  res.cookie('accessToken', accessToken, cookieOptions);

  // Check provider verification status
  let providerStatus = null;
  if (user.role === 'provider') {
    const provider = await Provider.findOne({ userId: user._id });
    providerStatus = provider?.verificationStatus || 'pending';
  }

  res.status(200).json(
    new ApiResponse(200, {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      providerStatus,
    }, 'Login successful.')
  );
});

// @desc    Login or Register user with Google (users only, not providers)
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { credential, role } = req.body;

  if (!credential) {
    throw new ApiError(400, 'Google credential is required.');
  }

  // Providers must not use Google auth
  if (role === 'provider') {
    throw new ApiError(400, 'Service providers must register with email and password.');
  }

  // Verify Google token
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw new ApiError(401, 'Invalid Google token.');
  }

  const payload = ticket.getPayload();
  const { email, name, picture } = payload;

  // Find user by email
  let user = await User.findOne({ email }).select('+password');

  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'Account has been deactivated. Contact support.');
    }
    // Block if user is a provider trying Google login
    if (user.role === 'provider') {
      throw new ApiError(400, 'Service providers must log in with email and password.');
    }
  } else {
    user = await User.create({
      name,
      email,
      avatar: picture,
      role: 'user',
      dashboard: '/user/dashboard',
      isVerified: true
    });
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Set cookie
  res.cookie('accessToken', accessToken, cookieOptions);

  res.status(200).json(
    new ApiResponse(200, {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    }, 'Google authentication successful.')
  );
});

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires +otpAttempts');
  if (!user) {
    // Don't reveal that the user doesn't exist
    res.status(200).json(
      new ApiResponse(200, null, 'If an account with this email exists, an OTP has been sent.')
    );
    return;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP before saving
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  user.resetPasswordOtp = hashedOtp;
  user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  // Send OTP email
  try {
    const mailer = await getTransporter();

    if (!mailer) {
      // Last resort fallback: return OTP in response for development use
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 RESET OTP (no email configured):', otp);
      console.log('📧 Configure SMTP in .env to send real emails');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      res.status(200).json(
        new ApiResponse(
          200,
          { devOtp: otp, mailConfigured: false },
          'Dev mode: SMTP not configured. OTP returned in response for testing.'
        )
      );
      return;
    }

    const smtpFrom = process.env.SMTP_FROM ||
      `"Seva Sarthi" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@sevasarthi.in'}>`;

    const info = await mailer.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Password Reset OTP - Seva Sarthi',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #0F172A 0%, #1e293b 100%); padding: 32px 40px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-size: 28px;">🔧</span>
              <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Seva Sarthi</span>
            </div>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #0F172A; margin: 0 0 8px; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
            <p style="color: #64748b; margin: 0 0 28px; font-size: 15px; line-height: 1.6;">
              We received a request to reset the password for <strong>${email}</strong>.
              Use the OTP below — it expires in <strong>10 minutes</strong>.
            </p>
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 28px; text-align: center; margin-bottom: 28px;">
              <p style="color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 10px;">Your OTP</p>
              <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0F172A; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Seva Sarthi. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    // For Ethereal dev accounts, log the preview URL so devs can see the email
    if (transporterMode === 'ethereal-dev') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Ethereal Email Preview (open in browser to see OTP):');
      console.log('   ', previewUrl);
      console.log('🔑 OTP (dev shortcut):', otp);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

  } catch (err) {
    console.error('❌ Email send error:', err.message);
    // Reset transporter so next request tries fresh
    transporter = null;
    // Clear the OTP we already saved since email failed
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(
      500,
      `Failed to send OTP email. ${transporterMode === 'smtp-service' ? 'Check your Gmail App Password in .env (SMTP_PASS).' : 'Check your SMTP settings in .env.'}`
    );
  }

  res.status(200).json(
    new ApiResponse(200, { mailConfigured: true }, 'OTP sent to your email address.')
  );
});


// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required.');
  }

  const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpires +otpAttempts');
  if (!user) {
    throw new ApiError(400, 'Invalid request.');
  }

  // Check if OTP has expired
  if (!user.resetPasswordOtpExpires || user.resetPasswordOtpExpires < Date.now()) {
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // Check attempts (max 5)
  if (user.otpAttempts >= 5) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(429, 'Too many attempts. Please request a new OTP.');
  }

  // Compare hashed OTP
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  if (hashedOtp !== user.resetPasswordOtp) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, 'Invalid OTP. Please try again.');
  }

  // OTP is valid — generate a short-lived reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Reuse the OTP field to store the reset token temporarily (valid for 5 min)
  user.resetPasswordOtp = hashedResetToken;
  user.resetPasswordOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, { resetToken }, 'OTP verified successfully.')
  );
});

// @desc    Reset password (after OTP verified)
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, newPassword } = req.body;

  if (!email || !resetToken || !newPassword) {
    throw new ApiError(400, 'Email, reset token, and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }
  if (newPassword.length > 15) {
    throw new ApiError(400, 'Password cannot exceed 15 characters.');
  }

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const user = await User.findOne({
    email,
    resetPasswordOtp: hashedToken,
    resetPasswordOtpExpires: { $gt: Date.now() },
  }).select('+resetPasswordOtp +resetPasswordOtpExpires +password');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token.');
  }

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpires = undefined;
  user.otpAttempts = 0;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Password reset successfully. You can now log in.')
  );
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // Clear refresh token in DB
  await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });

  // Clear cookie
  res.clearCookie('accessToken', cookieOptions);

  res.status(200).json(
    new ApiResponse(200, null, 'Logged out successfully.')
  );
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found.');

  let providerProfile = null;
  let providerStatus = null;
  if (user.role === 'provider') {
    providerProfile = await Provider.findOne({ userId: user._id });
    providerStatus = providerProfile?.verificationStatus || 'pending';
  }

  res.status(200).json(
    new ApiResponse(200, {
      user: user.toJSON(),
      providerProfile,
      providerStatus,
    }, 'Profile retrieved.')
  );
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Password changed successfully.')
  );
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required.');
  }

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Refresh token has been revoked.');
  }

  const newAccessToken = user.generateAccessToken();
  res.cookie('accessToken', newAccessToken, cookieOptions);

  res.status(200).json(
    new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed.')
  );
});

// @desc    Send registration OTP to provider email
// @route   POST /api/auth/provider/send-otp
// @access  Public
const sendProviderOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required.');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (!global._providerOtpStore) global._providerOtpStore = {};
  global._providerOtpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };

  // Send via email
  try {
    const mailer = await getTransporter();
    if (mailer) {
      const smtpFrom = process.env.SMTP_FROM || `"Seva Sarthi" <${process.env.SMTP_USER || 'noreply@sevasarthi.in'}>`;
      await mailer.sendMail({
        from: smtpFrom, to: email,
        subject: 'Provider Registration OTP - Seva Sarthi',
        html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:30px;border:1px solid #e2e8f0;border-radius:16px;"><h2 style="color:#0F172A;">Seva Sarthi</h2><p>Your provider registration OTP is:</p><div style="background:#f8fafc;padding:20px;text-align:center;border-radius:12px;margin:20px 0;"><span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0F172A;">${otp}</span></div><p style="color:#94a3b8;font-size:13px;">Valid for 10 minutes. Do not share.</p></div>`
      });
      return res.status(200).json(new ApiResponse(200, { mailConfigured: true }, 'OTP sent to your email.'));
    }
  } catch (err) { console.error('Email send error:', err.message); }

  // Fallback: return in response for dev if email not configured
  console.log('📱 PROVIDER OTP:', otp, 'for', email);
  res.status(200).json(new ApiResponse(200, { devOtp: otp, mailConfigured: false }, 'OTP generated (Email not configured, check console).'));
});

// @desc    Verify provider registration OTP
const verifyProviderOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and OTP are required.');

  const stored = global._providerOtpStore?.[email];
  if (!stored) throw new ApiError(400, 'No OTP found. Please request a new one.');
  if (Date.now() > stored.expires) { delete global._providerOtpStore[email]; throw new ApiError(400, 'OTP expired.'); }
  if (stored.otp !== otp) throw new ApiError(400, 'Invalid OTP.');
  delete global._providerOtpStore[email];
  res.status(200).json(new ApiResponse(200, { verified: true }, 'OTP verified.'));
});

// ─── USER SIGNUP OTP ──────────────────────────────────────────────────────

// @desc    Send OTP for user signup
// @route   POST /api/auth/user/send-otp
const sendUserOtp = asyncHandler(async (req, res) => {
  const { type, email, phone } = req.body;

  let key;
  if (type === 'email') {
    if (!email) throw new ApiError(400, 'Email is required.');
    key = email.toLowerCase();
    const existing = await User.findOne({ email: key });
    if (existing) throw new ApiError(409, 'An account with this email already exists. Please login instead.');
  } else if (type === 'phone') {
    if (!phone) throw new ApiError(400, 'Phone is required.');
    key = phone.replace(/[\s\-+()]/g, '');
    if (key.startsWith('91') && key.length > 10) key = key.slice(2);
    const existing = await User.findOne({ phone: key });
    if (existing) throw new ApiError(409, 'An account with this phone number already exists. Please login instead.');
  } else {
    throw new ApiError(400, 'Invalid type.');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (!global._userOtpStore) global._userOtpStore = {};
  global._userOtpStore[key] = { otp, expires: Date.now() + 10 * 60 * 1000, attempts: 0, verified: false };

  if (type === 'email') {
    // Send via email
    try {
      const mailer = await getTransporter();
      if (mailer) {
        const smtpFrom = process.env.SMTP_FROM || `"Seva Sarthi" <${process.env.SMTP_USER || 'noreply@sevasarthi.in'}>`;
        await mailer.sendMail({
          from: smtpFrom, to: email,
          subject: 'Verify Your Email - Seva Sarthi',
          html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:30px;border:1px solid #e2e8f0;border-radius:16px;"><h2 style="color:#0F172A;">Welcome to Seva Sarthi!</h2><p>Your verification OTP is:</p><div style="background:#f8fafc;padding:20px;text-align:center;border-radius:12px;margin:20px 0;"><span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0F172A;">${otp}</span></div><p style="color:#94a3b8;font-size:13px;">Valid for 10 minutes. Do not share this code.</p></div>`
        });
        return res.status(200).json(new ApiResponse(200, { sent: true, method: 'email', mailConfigured: true }, 'OTP sent to your email address.'));
      }
    } catch (err) { console.error('Email send error:', err.message); }
  }

  // Fallback / Phone or Email failure
  console.log(`📱 USER ${type.toUpperCase()} OTP:`, otp, 'for', key);
  return res.status(200).json(new ApiResponse(200, { devOtp: otp, method: type, mailConfigured: false }, 'OTP generated successfully.'));
});

// @desc    Verify user signup OTP
// @route   POST /api/auth/user/verify-otp
const verifyUserOtp = asyncHandler(async (req, res) => {
  const { type, email, phone, otp } = req.body;
  
  let key;
  if (type === 'email') key = email?.toLowerCase();
  else if (type === 'phone') {
    key = phone?.replace(/[\s\-+()]/g, '');
    if (key?.startsWith('91') && key.length > 10) key = key.slice(2);
  }
  
  if (!key || !otp) throw new ApiError(400, 'Verification details are required.');

  const stored = global._userOtpStore?.[key];
  if (!stored) throw new ApiError(400, 'No OTP found. Please request a new one.');
  if (Date.now() > stored.expires) { delete global._userOtpStore[key]; throw new ApiError(400, 'OTP expired. Please request a new one.'); }
  if (stored.attempts >= 5) { delete global._userOtpStore[key]; throw new ApiError(429, 'Too many attempts. Please request a new OTP.'); }

  if (stored.otp !== otp) {
    stored.attempts += 1;
    throw new ApiError(400, `Invalid OTP. ${5 - stored.attempts} attempts remaining.`);
  }

  // Mark as verified and generate a verify token
  const verifyToken = crypto.randomBytes(16).toString('hex');
  stored.verified = true;
  stored.verifyToken = verifyToken;
  stored.expires = Date.now() + 15 * 60 * 1000; // Extend for registration

  res.status(200).json(new ApiResponse(200, { verified: true, otpToken: verifyToken }, 'Verification successful!'));
});

module.exports = {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  changePassword,
  refreshAccessToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  sendProviderOtp,
  verifyProviderOtp,
  sendUserOtp,
  verifyUserOtp,
};
