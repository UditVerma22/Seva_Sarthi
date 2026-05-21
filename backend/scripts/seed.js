require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');

const MONGODB_URI = process.env.MONGODB_URI;

const seedAdmin = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('✅ Connected to MongoDB');

    // Seed admin user (hardcoded credentials)
    const adminEmail = 'admin@sevasarthi.in';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Seva Sarthi Admin',
        email: adminEmail,
        password: 'Admin@123',
        role: 'admin',
        dashboard: '/admin/dashboard',
        isVerified: true,
        isActive: true,
      });
      console.log('✅ Admin user created: admin@sevasarthi.in / Admin@123');
    } else {
      console.log('ℹ️  Admin user already exists.');
    }

    // Seed default service categories
    const existingServices = await Service.countDocuments();
    if (existingServices === 0) {
      const services = [
        { name: 'Plumbing Repair', category: 'Plumbing', description: 'Fix leaks, pipe installations, and drainage issues', icon: 'plumbing', basePrice: 299 },
        { name: 'Electrical Wiring', category: 'Electrical Works', description: 'Wiring, switch repairs, and electrical installations', icon: 'electrical_services', basePrice: 349 },
        { name: 'Home Deep Cleaning', category: 'Professional Cleaning', description: 'Complete home deep cleaning service', icon: 'cleaning_services', basePrice: 1499 },
        { name: 'AC Servicing', category: 'Appliance Repair', description: 'AC gas refill, cleaning, and maintenance', icon: 'ac_unit', basePrice: 499 },
        { name: 'Carpentry Work', category: 'Carpentry', description: 'Furniture repair, assembly, and custom work', icon: 'carpenter', basePrice: 399 },
        { name: 'Painting Service', category: 'Painting', description: 'Interior and exterior painting services', icon: 'format_paint', basePrice: 899 },
        { name: 'Pest Control', category: 'Pest Control', description: 'Termite, cockroach, and rodent control', icon: 'pest_control', basePrice: 699 },
        { name: 'Garden Maintenance', category: 'Gardening & Landscaping', description: 'Lawn mowing, trimming, and garden upkeep', icon: 'yard', basePrice: 599 },
        { name: 'Home Maintenance', category: 'Home Maintenance', description: 'General home repair and maintenance', icon: 'home_repair_service', basePrice: 249 },
        { name: 'Salon at Home', category: 'Personal Care', description: 'Haircut, facial, and grooming at your doorstep', icon: 'content_cut', basePrice: 399 },
      ];
      await Service.insertMany(services);
      console.log('✅ Default services seeded.');
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedAdmin();
