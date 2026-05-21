require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Provider = require('../models/Provider');

const MONGODB_URI = process.env.MONGODB_URI;

const providers = [
  {
    user: {
      name: 'Rajesh Sharma',
      email: 'rajesh.sharma@sevasarthi.in',
      password: 'Provider@123',
      phone: '9876543210',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Indore', line1: '56, MG Road, Vijay Nagar', pincode: '452010' },
    },
    provider: {
      businessType: 'individual',
      businessName: 'Rajesh Plumbing Services',
      ownerName: 'Rajesh Sharma',
      phone: '9876543210',
      city: 'Indore',
      fullAddress: '56, MG Road, Vijay Nagar, Indore',
      pincode: '452010',
      primaryCategory: 'Plumbing',
      category: 'Plumbing',
      title: 'Expert Plumber',
      bio: 'Experienced plumber with 8+ years of expertise in residential and commercial plumbing. Specializing in pipe fitting, leak repairs, and bathroom installations.',
      skills: ['Pipe Fitting', 'Leak Repair', 'Bathroom Installation', 'Drainage Solutions'],
      experience: '8 yrs',
      pricePerHour: 350,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [75.8577, 22.7196] }, // Indore
    },
  },
  {
    user: {
      name: 'Amit Patel',
      email: 'amit.patel@sevasarthi.in',
      password: 'Provider@123',
      phone: '9823456789',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Ujjain', line1: '12, Freeganj Road', pincode: '456001' },
    },
    provider: {
      businessType: 'shop',
      businessName: 'Patel Electrical Works',
      ownerName: 'Amit Patel',
      phone: '9823456789',
      city: 'Ujjain',
      fullAddress: '12, Freeganj Road, Ujjain',
      pincode: '456001',
      primaryCategory: 'Electrical Works',
      category: 'Electrical Works',
      title: 'Certified Electrician',
      bio: 'Licensed electrician providing safe and reliable electrical services. Expert in wiring, switchboard installation, and electrical troubleshooting for homes and offices.',
      skills: ['Wiring', 'Switchboard Installation', 'Fan & Light Fitting', 'MCB Repair'],
      experience: '5 yrs',
      pricePerHour: 300,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [75.7885, 23.1765] }, // Ujjain
    },
  },
  {
    user: {
      name: 'Sunil Verma',
      email: 'sunil.verma@sevasarthi.in',
      password: 'Provider@123',
      phone: '9812345678',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Dewas', line1: '78, Station Road, Dewas', pincode: '455001' },
    },
    provider: {
      businessType: 'individual',
      businessName: 'Verma Home Cleaning',
      ownerName: 'Sunil Verma',
      phone: '9812345678',
      city: 'Dewas',
      fullAddress: '78, Station Road, Dewas',
      pincode: '455001',
      primaryCategory: 'Professional Cleaning',
      category: 'Professional Cleaning',
      title: 'Professional Cleaner',
      bio: 'Providing top-quality home and office deep cleaning services. We use eco-friendly products and modern equipment for spotless results every time.',
      skills: ['Deep Cleaning', 'Sofa Cleaning', 'Kitchen Cleaning', 'Bathroom Sanitization'],
      experience: '4 yrs',
      pricePerHour: 250,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [76.0534, 22.9623] }, // Dewas
    },
  },
  {
    user: {
      name: 'Vikram Singh',
      email: 'vikram.singh@sevasarthi.in',
      password: 'Provider@123',
      phone: '9834567890',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Bhopal', line1: '23, New Market, TT Nagar', pincode: '462003' },
    },
    provider: {
      businessType: 'agency',
      businessName: 'Singh AC & Appliance Care',
      ownerName: 'Vikram Singh',
      phone: '9834567890',
      city: 'Bhopal',
      fullAddress: '23, New Market, TT Nagar, Bhopal',
      pincode: '462003',
      primaryCategory: 'Appliance Repair',
      category: 'Appliance Repair',
      title: 'AC & Appliance Technician',
      bio: 'Certified technician specializing in AC servicing, refrigerator repair, and washing machine maintenance. Quick turnaround with 6-month service warranty.',
      skills: ['AC Servicing', 'Refrigerator Repair', 'Washing Machine Repair', 'Microwave Repair'],
      experience: '6 yrs',
      pricePerHour: 400,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [77.4126, 23.2599] }, // Bhopal
    },
  },
  {
    user: {
      name: 'Priya Joshi',
      email: 'priya.joshi@sevasarthi.in',
      password: 'Provider@123',
      phone: '9801234567',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Indore', line1: '102, Palasia Square, AB Road', pincode: '452001' },
    },
    provider: {
      businessType: 'individual',
      businessName: 'Joshi Painting & Decor',
      ownerName: 'Priya Joshi',
      phone: '9801234567',
      city: 'Indore',
      fullAddress: '102, Palasia Square, AB Road, Indore',
      pincode: '452001',
      primaryCategory: 'Painting',
      category: 'Painting',
      title: 'Interior Painter & Decorator',
      bio: 'Creative interior and exterior painter with an eye for detail. Specializing in texture painting, wall art, and waterproofing solutions for homes and offices.',
      skills: ['Interior Painting', 'Texture Painting', 'Wall Art', 'Waterproofing'],
      experience: '6 yrs',
      pricePerHour: 400,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [75.8573, 22.7252] }, // Indore
    },
  },
  {
    user: {
      name: 'Deepak Tiwari',
      email: 'deepak.tiwari@sevasarthi.in',
      password: 'Provider@123',
      phone: '9845678901',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Ujjain', line1: '45, Subhash Marg, Tower Chowk', pincode: '456006' },
    },
    provider: {
      businessType: 'shop',
      businessName: 'Tiwari Carpentry Works',
      ownerName: 'Deepak Tiwari',
      phone: '9845678901',
      city: 'Ujjain',
      fullAddress: '45, Subhash Marg, Tower Chowk, Ujjain',
      pincode: '456006',
      primaryCategory: 'Carpentry',
      category: 'Carpentry',
      title: 'Master Carpenter',
      bio: 'Skilled carpenter crafting custom furniture, modular kitchens, and wooden interiors. Known for quality craftsmanship and timely delivery across Ujjain.',
      skills: ['Custom Furniture', 'Modular Kitchen', 'Door & Window Fitting', 'Wood Polishing'],
      experience: '10 yrs',
      pricePerHour: 450,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [75.7804, 23.1828] }, // Ujjain
    },
  },
  {
    user: {
      name: 'Kavita Malviya',
      email: 'kavita.malviya@sevasarthi.in',
      password: 'Provider@123',
      phone: '9867890123',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Dewas', line1: '33, Nagar Palika Road', pincode: '455001' },
    },
    provider: {
      businessType: 'individual',
      businessName: 'Malviya Pest Solutions',
      ownerName: 'Kavita Malviya',
      phone: '9867890123',
      city: 'Dewas',
      fullAddress: '33, Nagar Palika Road, Dewas',
      pincode: '455001',
      primaryCategory: 'Pest Control',
      category: 'Pest Control',
      title: 'Pest Control Specialist',
      bio: 'Certified pest control professional offering safe and effective treatments for termites, cockroaches, mosquitoes, and rodents with eco-friendly chemicals.',
      skills: ['Termite Treatment', 'Cockroach Control', 'Mosquito Fogging', 'Rodent Control'],
      experience: '3 yrs',
      pricePerHour: 500,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [76.0508, 22.9676] }, // Dewas
    },
  },
  {
    user: {
      name: 'Arjun Dubey',
      email: 'arjun.dubey@sevasarthi.in',
      password: 'Provider@123',
      phone: '9878901234',
      role: 'provider',
      dashboard: '/provider/dashboard',
      isVerified: true,
      isActive: true,
      address: { city: 'Bhopal', line1: '89, Shahpura, Hoshangabad Road', pincode: '462016' },
    },
    provider: {
      businessType: 'agency',
      businessName: 'Dubey Home Services',
      ownerName: 'Arjun Dubey',
      phone: '9878901234',
      city: 'Bhopal',
      fullAddress: '89, Shahpura, Hoshangabad Road, Bhopal',
      pincode: '462016',
      primaryCategory: 'Home Maintenance',
      category: 'Home Maintenance',
      title: 'Home Maintenance Expert',
      bio: 'One-stop solution for all home repair needs — from fixing doors and taps to assembling furniture and wall mounting. Fast, reliable, and affordable service in Bhopal.',
      skills: ['General Repairs', 'Furniture Assembly', 'Wall Mounting', 'Tap & Faucet Repair'],
      experience: '7 yrs',
      pricePerHour: 280,
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isAvailable: true,
      verificationStatus: 'approved',
      isVerifiedProvider: true,
      approvedAt: new Date(),
      location: { type: 'Point', coordinates: [77.4329, 23.2332] }, // Bhopal
    },
  },
];

const seedProviders = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('✅ Connected to MongoDB');

    for (const data of providers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.user.email });
      if (existingUser) {
        console.log(`ℹ️  Provider "${data.user.name}" already exists, skipping...`);
        continue;
      }

      // Create User
      const user = await User.create(data.user);
      console.log(`✅ User created: ${user.name} (${user.email})`);

      // Create Provider linked to User
      const providerData = { ...data.provider, userId: user._id };
      await Provider.create(providerData);
      console.log(`✅ Provider profile created: ${data.provider.businessName} — ${data.provider.city}`);
    }

    console.log('\n🎉 All providers seeded successfully!');
    console.log('\n📋 Provider Login Credentials:');
    console.log('━'.repeat(50));
    for (const data of providers) {
      console.log(`  ${data.user.name} (${data.provider.city})`);
      console.log(`    Email: ${data.user.email}`);
      console.log(`    Password: Provider@123`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedProviders();
