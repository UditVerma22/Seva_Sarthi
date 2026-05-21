const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const { ROLES, PROVIDER_STATUS, BUSINESS_TYPES } = require('../utils/constants');

const DB_URI = process.env.MONGODB_URI;

const categories = [
  'Appliance Repair',
  'Electrical Works',
  'Plumbing',
  'Carpentry',
  'Professional Cleaning',
  'Pest Control',
  'Painting'
];

const serviceTemplates = {
  'Appliance Repair': [
    { name: 'AC Service & Repair', description: 'Expert AC servicing, gas refilling and repair', basePrice: 499, icon: 'ac_unit' },
    { name: 'Washing Machine Repair', description: 'Quick fix for top/front load washing machines', basePrice: 349, icon: 'local_laundry_service' }
  ],
  'Electrical Works': [
    { name: 'Switch & Board Repair', description: 'Repairing and replacing electrical switches and boards', basePrice: 99, icon: 'electrical_services' },
    { name: 'Fan Installation', description: 'Ceiling and wall fan installation services', basePrice: 199, icon: 'mode_fan' }
  ],
  'Plumbing': [
    { name: 'Tap & Pipe Leakage', description: 'Fixing leaking taps, pipes and sinks', basePrice: 149, icon: 'plumbing' },
    { name: 'Drain Cleaning', description: 'Clearing blocked drains and pipes', basePrice: 249, icon: 'water_drop' }
  ],
  'Carpentry': [
    { name: 'Furniture Assembly', description: 'Assembling beds, tables, and cabinets', basePrice: 299, icon: 'handyman' },
    { name: 'Door Lock Repair', description: 'Fixing and installing new door locks', basePrice: 199, icon: 'lock' }
  ],
  'Professional Cleaning': [
    { name: 'Bathroom Deep Cleaning', description: 'Intense cleaning of bathroom tiles and fixtures', basePrice: 499, icon: 'bathroom' },
    { name: 'Sofa Deep Cleaning', description: 'Shampooing and deep cleaning of 3-seater sofa', basePrice: 749, icon: 'weekend' }
  ],
  'Pest Control': [
    { name: 'Cockroach Control', description: 'Effective spray and gel treatment for cockroaches', basePrice: 899, icon: 'pest_control' },
    { name: 'Termite Control', description: 'Anti-termite treatment for wood and walls', basePrice: 1499, icon: 'bug_report' }
  ],
  'Painting': [
    { name: 'Full Home Painting', description: 'Professional painting for 2BHK/3BHK homes', basePrice: 4999, icon: 'format_paint' },
    { name: 'Waterproofing', description: 'Terrace and wall waterproofing services', basePrice: 1999, icon: 'water_damage' }
  ]
};

const providersData = [
  {
    name: 'Ramesh Demo Provider',
    email: 'vanshjaiswal230764@acropolis.in',
    phone: '9988776655',
    password: 'password123',
    city: 'Indore',
    primaryCategory: 'Appliance Repair',
    bio: 'Experienced professional providing all types of home services.',
    priceModifier: 1.0 // Base prices
  },
  {
    name: 'Suresh Demo Provider',
    email: 'suresh.demo@example.com',
    phone: '8877665544',
    password: 'password123',
    city: 'Indore',
    primaryCategory: 'Professional Cleaning',
    bio: 'Expert in deep cleaning and pest control services.',
    priceModifier: 1.2 // Slightly higher prices
  }
];

async function seed() {
  try {
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    for (const pData of providersData) {
      // 1. Create User
      let user = await User.findOne({ email: pData.email });
      if (!user) {
        user = new User({
          name: pData.name,
          email: pData.email,
          phone: pData.phone,
          password: pData.password,
          role: ROLES.PROVIDER,
          dashboard: '/provider/dashboard',
          isVerified: true,
          isPhoneVerified: true,
          isActive: true
        });
        await user.save();
        console.log(`Created User: ${user.name}`);
      } else {
        user.dashboard = '/provider/dashboard';
        user.address = { ...user.address, city: pData.city };
        await user.save();
        console.log(`Updated User: ${user.name} (Dashboard: ${user.dashboard}, City: ${user.address.city})`);
      }

      // 2. Create Provider Profile
      let provider = await Provider.findOne({ userId: user._id });
      if (!provider) {
        provider = new Provider({
          userId: user._id,
          businessType: BUSINESS_TYPES.INDIVIDUAL,
          businessName: `${pData.name} Services`,
          ownerName: pData.name,
          phone: pData.phone,
          city: pData.city,
          primaryCategory: pData.primaryCategory,
          verificationStatus: PROVIDER_STATUS.APPROVED,
          category: pData.primaryCategory,
          bio: pData.bio,
          rating: 0,
          reviewCount: 0,
          experience: 'New',
          jobsCompleted: 0,
          isAvailable: true
        });
        await provider.save();
        console.log(`Created Provider Profile: ${provider.businessName}`);
      } else {
        // Ensure status is pending and city is updated for demo
        provider.verificationStatus = PROVIDER_STATUS.APPROVED;
        provider.city = pData.city;
        provider.rating = 0;
        provider.reviewCount = 0;
        provider.experience = 'New';
        provider.jobsCompleted = 0;
        await provider.save();
        console.log(`Updated Provider: ${provider.businessName} (City: ${provider.city})`);
      }

      // 3. Create Services for this provider (2 per category)
      for (const cat of categories) {
        const templates = serviceTemplates[cat];
        for (const template of templates) {
          // Check if service exists for this provider
          let service = await Service.findOne({ providerId: user._id, name: template.name, category: cat });
          if (!service) {
            service = new Service({
              name: template.name,
              category: cat,
              description: template.description,
              icon: template.icon,
              basePrice: Math.round(template.basePrice * pData.priceModifier),
              providerId: user._id,
              isActive: true,
              approvalStatus: 'approved'
            });
            await service.save();
            console.log(`Created Service: ${service.name} for ${pData.name}`);
          } else {
            service.approvalStatus = 'approved';
            await service.save();
            console.log(`Updated Service: ${service.name} for ${pData.name}`);
          }
        }
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
