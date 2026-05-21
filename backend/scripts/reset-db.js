require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Tool = require('../models/Tool');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const Rental = require('../models/Rental');

const MONGODB_URI = process.env.MONGODB_URI;

const resetDB = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('✅ Connected to MongoDB for database reset');

    console.log('🗑️  Clearing all data from collections...');
    
    await Promise.all([
      User.deleteMany({}),
      Provider.deleteMany({}),
      Service.deleteMany({}),
      Tool.deleteMany({}),
      Coupon.deleteMany({}),
      Notification.deleteMany({}),
      Booking.deleteMany({}),
      Complaint.deleteMany({}),
      Review.deleteMany({}),
      Rental.deleteMany({}),
    ]);

    console.log('✅ Database reset successfully! All collections are now completely empty.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
};

resetDB();
