const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['topup', 'online_earning', 'cod_fee', 'rental_earning', 'payout', 'refund'],
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const providerWalletSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalPlatformFees: {
      type: Number,
      default: 0,
    },
    totalTopUps: {
      type: Number,
      default: 0,
    },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);


// Helper method to add a credit transaction
providerWalletSchema.methods.credit = function (amount, description, category, meta = {}) {
  this.balance += amount;
  this.totalEarned += (category === 'online_earning' || category === 'rental_earning') ? amount : 0;
  this.totalTopUps += category === 'topup' ? amount : 0;

  this.transactions.push({
    type: 'credit',
    amount,
    description,
    category,
    balanceAfter: this.balance,
    ...meta,
  });

  return this;
};

// Helper method to add a debit transaction
providerWalletSchema.methods.debit = function (amount, description, category, meta = {}) {
  this.balance -= amount;
  this.totalPlatformFees += category === 'cod_fee' ? amount : 0;

  this.transactions.push({
    type: 'debit',
    amount,
    description,
    category,
    balanceAfter: this.balance,
    ...meta,
  });

  return this;
};

module.exports = mongoose.model('ProviderWallet', providerWalletSchema);
