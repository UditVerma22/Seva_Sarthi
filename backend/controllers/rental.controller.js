const Rental = require('../models/Rental');
const Tool = require('../models/Tool');
const Provider = require('../models/Provider');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { TOOL_STATUS } = require('../utils/constants');
const { createAndPushNotification } = require('../services/notification.service');
const { getIO } = require('../config/socket');
const { getOrCreateWallet } = require('./wallet.controller');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const createRental = asyncHandler(async (req, res) => {
  const { toolId, days, deliveryDetails, paymentMethod } = req.body;
  const tool = await Tool.findById(toolId);
  if (!tool) throw new ApiError(404, 'Tool not found.');
  if (tool.status !== TOOL_STATUS.AVAILABLE) throw new ApiError(400, 'Tool is not available for rent.');

  const subtotal = tool.dailyRate * days;
  const deliveryFee = 99;
  const tax = Math.round(subtotal * 0.05);
  const refundableDeposit = Math.max(500, Math.round(subtotal * 0.4));
  const total = subtotal + deliveryFee + tax;
  const fee = 49;
  
  const provider = await Provider.findOne({ userId: tool.ownerId });
  if (!provider) throw new ApiError(404, 'Tool provider profile not found.');

  // ── Wallet check for COD rentals ──────────────────────
  const rentalPaymentMethod = paymentMethod || 'online';
  if (rentalPaymentMethod === 'cash_on_delivery') {
    const wallet = await getOrCreateWallet(provider._id);
    const totalDeduction = fee + tax;
    if (wallet.balance < totalDeduction) {
      throw new ApiError(
        400,
        `Tool owner's wallet balance (₹${wallet.balance}) is insufficient to cover the platform fee + tax (₹${totalDeduction}). Owner must top up their wallet to accept COD rentals.`
      );
    }
  }

  const rental = await Rental.create({
    userId: req.user._id, toolId, toolName: tool.name, days,
    subtotal, deliveryFee, tax, refundableDeposit, total,
    platformFee: fee, paymentMethod: rentalPaymentMethod,
    deliveryDetails, status: 'confirmed',
    deliveryOtp: generateOTP(),
    returnOtp: generateOTP(),
  });

  tool.status = TOOL_STATUS.RENTED;
  await tool.save();

  await createAndPushNotification({
    userId: req.user._id, title: 'Rental Confirmed',
    message: `Your rental for ${tool.name} (${days} days) has been confirmed. Total: ₹${total}.`,
    type: 'rental', metadata: { rentalId: rental._id },
  });

  // Notify tool owner (provider)
  await createAndPushNotification({
    userId: tool.ownerId.toString(), title: 'New Tool Rental',
    message: `${req.user.name} has rented your "${tool.name}" for ${days} days. Total: ₹${total}.`,
    type: 'rental', metadata: { rentalId: rental._id },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${req.user._id.toString()}`).emit('new_rental', rental);
    io.to(`user:${tool.ownerId.toString()}`).emit('new_rental', rental);
  }

  res.status(201).json(new ApiResponse(201, { rental }, 'Rental created successfully.'));
});

const getRental = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.id).populate('toolId', 'name image dailyRate');
  if (!rental) throw new ApiError(404, 'Rental not found.');
  res.status(200).json(new ApiResponse(200, { rental }, 'Rental retrieved.'));
});

const updateRentalStatus = asyncHandler(async (req, res) => {
  const { status, otp } = req.body;
  const rental = await Rental.findById(req.params.id).populate('toolId');
  if (!rental) throw new ApiError(404, 'Rental not found.');

  // Check OTPs if transitioning to delivered or returned
  if (status === 'delivered') {
    if (rental.deliveryOtp !== otp) {
      throw new ApiError(400, 'Invalid Delivery OTP');
    }
  } else if (status === 'returned') {
    if (rental.returnOtp !== otp) {
      throw new ApiError(400, 'Invalid Return OTP');
    }
    await Tool.findByIdAndUpdate(rental.toolId._id, { status: TOOL_STATUS.AVAILABLE });

    // ── Wallet credit/debit on return ──────────────────
    try {
      const provider = await Provider.findOne({ userId: rental.toolId.ownerId });
      if (provider) {
        const wallet = await getOrCreateWallet(provider._id);
        const fee = rental.platformFee || 49;
        const tax = rental.tax || 0;
        const totalDeductions = fee + tax;
        const rentalRef = rental._id.toString().slice(-6).toUpperCase();

        if (rental.paymentMethod === 'online') {
          // Note: for rentals, the total includes refundable deposit and delivery fee.
          // The provider earns the rental subtotal - fee - tax. Delivery fee goes to the platform (if applicable) or to the provider if they deliver. Assuming provider delivers here, so provider gets total - deposit - deductions.
          // Wait, refundable deposit is returned to customer. The provider earns subtotal + deliveryFee (if provider delivers). Let's use `total - deductions`.
          const providerShare = rental.total - totalDeductions;
          if (providerShare > 0) {
            wallet.credit(
              providerShare,
              `Earnings — Online rental #${rentalRef} (₹${rental.total} - ₹${fee} fee - ₹${tax} tax)`,
              'online_earning',
              { rentalId: rental._id }
            );
          }
        } else {
          // COD: provider collected cash, so platform debits fee + tax
          wallet.debit(
            totalDeductions,
            `Platform fee + Tax — COD rental #${rentalRef} (₹${fee} fee + ₹${tax} tax)`,
            'cod_fee',
            { rentalId: rental._id }
          );
        }
        await wallet.save();
      }
    } catch (err) {
      console.error('Wallet rental transaction error:', err.message);
    }
  }

  rental.status = status;
  await rental.save();

  await createAndPushNotification({
    userId: rental.userId, title: 'Rental Updated',
    message: `Your rental status has been updated to: ${status}.`,
    type: 'rental', metadata: { rentalId: rental._id },
  });

  const io = getIO();
  if (io) {
    io.to(`user:${rental.userId.toString()}`).emit('rental_updated', rental);
    if (rental.toolId && rental.toolId.ownerId) {
      io.to(`user:${rental.toolId.ownerId.toString()}`).emit('rental_updated', rental);
    }
  }

  res.status(200).json(new ApiResponse(200, { rental }, `Rental status updated to ${status}.`));
});

const getProviderRentals = asyncHandler(async (req, res) => {
  const tools = await Tool.find({ ownerId: req.user._id }).select('_id');
  const toolIds = tools.map((t) => t._id);

  const rentals = await Rental.find({ toolId: { $in: toolIds } })
    .populate('userId', 'name phone avatar')
    .populate('toolId', 'name image dailyRate')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, { rentals }, 'Provider rentals retrieved.'));
});

module.exports = { createRental, getRental, updateRentalStatus, getProviderRentals };
