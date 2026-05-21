require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');

const MONGODB_URI = process.env.MONGODB_URI;

const coupons = [
  {
    title: 'Welcome Discount',
    subtitle: 'Flat 50% off on your first booking up to ₹200',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070',
    showOnHome: true,
    userType: 'new',
    code: 'WELCOME50',
    discountType: 'percent',
    discountValue: 50,
    maxDiscount: 200,
    minOrderAmount: 0,
    isActive: true,
    description: 'Get 50% off your first ever booking on Seva Sarthi.',
  },
  {
    title: 'Flat ₹100 Off',
    subtitle: 'Save ₹100 on any service worth ₹500 or more',
    imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070',
    showOnHome: true,
    userType: 'all',
    code: 'SEVAFLAT100',
    discountType: 'flat',
    discountValue: 100,
    maxDiscount: null,
    minOrderAmount: 500,
    isActive: true,
    description: 'Flat ₹100 discount on minimum booking of ₹500.',
  },
  {
    title: 'Festive Special',
    subtitle: '20% off on all services up to ₹500',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071',
    showOnHome: true,
    userType: 'all',
    code: 'FESTIVE20',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 500,
    minOrderAmount: 0,
    isActive: true,
    description: 'Celebrate with 20% off up to ₹500 on all bookings.',
  },
  {
    title: 'Summer Cooling',
    subtitle: 'Flat ₹50 off on AC & Cooler Services',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070',
    showOnHome: true,
    userType: 'all',
    code: 'SUMMERCOOL',
    discountType: 'flat',
    discountValue: 50,
    maxDiscount: null,
    minOrderAmount: 0,
    isActive: true,
    description: 'Beat the heat with a flat ₹50 discount.',
  },
  {
    title: 'Premium Savings',
    subtitle: 'Flat ₹500 off on large bookings above ₹2000',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070',
    showOnHome: true,
    userType: 'all',
    code: 'PREMIUM500',
    discountType: 'flat',
    discountValue: 500,
    maxDiscount: null,
    minOrderAmount: 2000,
    isActive: true,
    description: 'Big savings on major repairs and deep cleaning.',
  }
];

const seedCoupons = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('✅ Connected to MongoDB for coupon seeding');

    console.log('🗑️  Clearing existing coupons...');
    await Coupon.deleteMany({});
    
    console.log('🌱 Seeding 5 new coupons...');
    await Coupon.insertMany(coupons);

    console.log('✅ Coupons seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedCoupons();
