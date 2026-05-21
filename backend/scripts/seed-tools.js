const mongoose = require('mongoose');
const Tool = require('../models/Tool');
const Provider = require('../models/Provider');
const User = require('../models/User');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/seva_sarthi';

const toolData = {
  'Power Tools': [
    { name: 'Bosch Professional Cordless Drill', description: 'High power 18V drill for concrete and wood', dailyRate: 250, image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&q=80' },
    { name: 'Makita Circular Saw', description: '7-1/4 inch circular saw with powerful motor', dailyRate: 300, image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=500&q=80' },
    { name: 'DeWalt Angle Grinder', description: 'Heavy duty 4.5 inch angle grinder', dailyRate: 200, image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500&q=80' },
    { name: 'Black+Decker Orbital Sander', description: 'Compact sander for smooth finishes', dailyRate: 150, image: 'https://plus.unsplash.com/premium_photo-1664302152996-039e160eafcc?w=500&q=80' },
    { name: 'Stanley Air Compressor', description: '24L air compressor for various tools', dailyRate: 400, image: 'https://images.unsplash.com/photo-1581147036324-c17448dbff8b?w=500&q=80' }
  ],
  'Hand Tools': [
    { name: 'Taparia 1041 Claw Hammer', description: 'Durable steel claw hammer with comfortable grip', dailyRate: 50, image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500&q=80' },
    { name: 'Stanley Adjustable Wrench Set', description: 'Set of 3 adjustable wrenches (8", 10", 12")', dailyRate: 80, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80' },
    { name: 'Heavy Duty Pliers', description: 'Combination pliers and wire cutter', dailyRate: 40, image: 'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=500&q=80' },
    { name: 'Screwdriver Toolkit', description: '42 piece multi-purpose screwdriver set', dailyRate: 60, image: 'https://images.unsplash.com/photo-1581147036324-c17448dbff8b?w=500&q=80' },
    { name: 'Professional Spirit Level', description: 'Aluminium spirit level 24 inch', dailyRate: 70, image: 'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=500&q=80' }
  ],
  'Construction': [
    { name: 'Aluminium Step Ladder', description: '6-step foldable ladder for indoor/outdoor use', dailyRate: 150, image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80' },
    { name: 'Steel Scaffolding Set', description: 'Basic scaffolding frame set (per day)', dailyRate: 500, image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&q=80' },
    { name: 'Concrete Mixer Machine', description: 'Portable mini concrete mixer', dailyRate: 800, image: 'https://images.unsplash.com/photo-1541888086903-efdc24abac3b?w=500&q=80' },
    { name: 'Heavy Duty Wheelbarrow', description: 'Construction grade wheelbarrow', dailyRate: 200, image: 'https://images.unsplash.com/photo-1580983537233-9080b06b001a?w=500&q=80' },
    { name: 'Earth Compactor', description: 'Petrol engine plate compactor', dailyRate: 1000, image: 'https://images.unsplash.com/photo-1581147036324-c17448dbff8b?w=500&q=80' }
  ],
  'Gardening': [
    { name: 'Honda Electric Lawnmower', description: 'Easy start electric lawnmower for small gardens', dailyRate: 350, image: 'https://images.unsplash.com/photo-1592424005754-071c66708fb8?w=500&q=80' },
    { name: 'Bosch Hedge Trimmer', description: 'Cordless hedge trimmer for precise cutting', dailyRate: 250, image: 'https://images.unsplash.com/photo-1416879573089-116f90126a0b?w=500&q=80' },
    { name: 'Heavy Duty Steel Shovel', description: 'Digging shovel with wooden handle', dailyRate: 50, image: 'https://images.unsplash.com/photo-1590497585091-64c8d1d866a2?w=500&q=80' },
    { name: 'Gardening Rake', description: 'Leaf rake for garden maintenance', dailyRate: 40, image: 'https://images.unsplash.com/photo-1416879573089-116f90126a0b?w=500&q=80' },
    { name: 'Stihl Chainsaw', description: 'Petrol chainsaw for wood cutting', dailyRate: 600, image: 'https://images.unsplash.com/photo-1581147036324-c17448dbff8b?w=500&q=80' }
  ]
};

async function seedTools() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing tools
    await Tool.deleteMany({});
    console.log('Cleared existing tools');

    // Fetch all providers
    const providers = await Provider.find({}).populate('userId');
    if (providers.length === 0) {
      console.log('No providers found. Please run your provider seed first.');
      process.exit(1);
    }

    console.log(`Found ${providers.length} providers`);

    // Group providers by city
    const providersByCity = {};
    providers.forEach(p => {
      const city = p.city || 'Unknown';
      if (!providersByCity[city]) {
        providersByCity[city] = [];
      }
      providersByCity[city].push(p);
    });

    let toolCount = 0;

    // For each city, distribute tools across its providers
    for (const [city, cityProviders] of Object.entries(providersByCity)) {
      console.log(`Adding tools for city: ${city} with ${cityProviders.length} providers`);
      
      for (const [category, toolsList] of Object.entries(toolData)) {
        for (let i = 0; i < toolsList.length; i++) {
          const toolTemplate = toolsList[i];
          // Round-robin assign tool to a provider in this city
          const provider = cityProviders[i % cityProviders.length];
          
          const newTool = new Tool({
            name: toolTemplate.name,
            description: toolTemplate.description,
            category: category,
            condition: ['Like New', 'Good', 'Fair'][Math.floor(Math.random() * 3)],
            dailyRate: toolTemplate.dailyRate,
            image: toolTemplate.image,
            ownerId: provider.userId._id || provider.userId,
            status: 'available',
            isVerified: true,
            rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
            distance: (Math.random() * 10 + 1).toFixed(1) + 'km',
            location: provider.location || { type: 'Point', coordinates: [77.5946, 12.9716] }
          });
          
          await newTool.save();
          toolCount++;
        }
      }
    }

    console.log(`Successfully seeded ${toolCount} tools!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tools:', error);
    process.exit(1);
  }
}

seedTools();
