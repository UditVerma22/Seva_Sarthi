require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Service = require('../models/Service');

const MONGODB_URI = process.env.MONGODB_URI;

// ── Provider emails mapped by city ──────────────────────
const providerEmails = {
  Indore: ['rajesh.sharma@sevasarthi.in', 'priya.joshi@sevasarthi.in'],
  Ujjain: ['amit.patel@sevasarthi.in', 'deepak.tiwari@sevasarthi.in'],
  Dewas: ['sunil.verma@sevasarthi.in', 'kavita.malviya@sevasarthi.in'],
  Bhopal: ['vikram.singh@sevasarthi.in', 'arjun.dubey@sevasarthi.in'],
};

// ── All 18 sub-item services ────────────────────────────
// Each sub-item has 2 variations: [0] = Provider 1, [1] = Provider 2
// This ensures BOTH providers show up when user clicks ANY sub-item

const allServices = [
  // ═══════════════════════════════════════════════════════
  // AC & Appliance Repair (6 sub-items)
  // ═══════════════════════════════════════════════════════

  // 1. AC
  {
    category: 'Appliance Repair',
    variations: [
      { name: 'AC Service & Gas Refill', description: 'Complete AC servicing including deep cleaning, gas refill, and performance check for split and window ACs.', icon: 'ac_unit', basePrice: 499 },
      { name: 'AC Repair & Deep Cleaning', description: 'AC compressor repair, deep cleaning, gas top-up, and cooling efficiency check for all AC models.', icon: 'ac_unit', basePrice: 549 },
    ],
  },
  // 2. Washing Machine
  {
    category: 'Appliance Repair',
    variations: [
      { name: 'Washing Machine Repair', description: 'Expert repair for front-load and top-load washing machines — drum issues, motor problems, and water leakage.', icon: 'local_laundry_service', basePrice: 399 },
      { name: 'Washing Machine Service & Fix', description: 'Complete washing machine servicing — drum cleaning, inlet valve repair, and spin cycle fixing for all brands.', icon: 'local_laundry_service', basePrice: 449 },
    ],
  },
  // 3. Refrigerator Repair
  {
    category: 'Appliance Repair',
    variations: [
      { name: 'Refrigerator Repair & Service', description: 'Fridge not cooling? Expert repair for compressor, thermostat, gas refill, and defrost issues.', icon: 'kitchen', basePrice: 449 },
      { name: 'Fridge & Freezer Repair', description: 'Comprehensive fridge repair — cooling problems, ice build-up, water leaking, and door seal replacement.', icon: 'kitchen', basePrice: 499 },
    ],
  },
  // 4. Microwave
  {
    category: 'Appliance Repair',
    variations: [
      { name: 'Microwave Oven Repair', description: 'Microwave not heating? Magnetron, turntable motor, door switch, and control panel repair.', icon: 'microwave', basePrice: 349 },
      { name: 'Microwave & Oven Service', description: 'Professional microwave repair — heating issues, sparking, display panel fix, and deep cleaning.', icon: 'microwave', basePrice: 399 },
    ],
  },
  // 5. RO/Water Purifier
  {
    category: 'Appliance Repair',
    variations: [
      { name: 'RO Water Purifier Service', description: 'RO service including filter replacement, membrane cleaning, UV lamp check, and TDS calibration.', icon: 'water_drop', basePrice: 349 },
      { name: 'RO & Water Purifier Repair', description: 'Complete water purifier repair — RO membrane, UV filter, mineral cartridge replacement, and leak fixing.', icon: 'water_drop', basePrice: 399 },
    ],
  },
  // 6. Geyser
  {
    category: 'Appliance Repair',
    variations: [
      { name: 'Geyser Repair & Installation', description: 'Geyser not heating? Thermostat repair, element replacement, and new geyser installation service.', icon: 'hot_tub', basePrice: 399 },
      { name: 'Geyser & Water Heater Service', description: 'Water heater repair — heating element, pressure valve, anode rod replacement, and safety check.', icon: 'hot_tub', basePrice: 449 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // Electrician, Plumber & Carpenter (4 sub-items)
  // ═══════════════════════════════════════════════════════

  // 7. Electrician
  {
    category: 'Electrical Works',
    variations: [
      { name: 'Electrical Wiring & Switchboard', description: 'Complete wiring solutions — switchboard installation, MCB repair, and short circuit fixing by certified electricians.', icon: 'electrical_services', basePrice: 249 },
      { name: 'Electrician - Switch & MCB Repair', description: 'Professional electrical services — switch repair, wiring fault detection, MCB installation, and safety inspection.', icon: 'electrical_services', basePrice: 299 },
    ],
  },
  // 8. Plumber
  {
    category: 'Plumbing',
    variations: [
      { name: 'Plumber - Tap & Pipe Leak Repair', description: 'Quick fix for leaking taps, pipe joints, and faucets. Includes replacement of washers and valves if needed.', icon: 'plumbing', basePrice: 199 },
      { name: 'Plumber - Pipe Fitting & Leak Fix', description: 'Expert pipe fitting, tap replacement, water connection repair, and faucet installation services.', icon: 'plumbing', basePrice: 249 },
    ],
  },
  // 9. Carpenter
  {
    category: 'Carpentry',
    variations: [
      { name: 'Carpenter - Furniture & Door Repair', description: 'Bed, wardrobe, and door repair. Cabinet fixing, hinge replacement, and custom woodwork.', icon: 'carpenter', basePrice: 299 },
      { name: 'Carpenter - Wood & Cabinet Work', description: 'Custom furniture work, cabinet repair, shelf installation, and wardrobe hinge replacement by expert carpenter.', icon: 'carpenter', basePrice: 349 },
    ],
  },
  // 10. Furniture Assembly
  {
    category: 'Carpentry',
    variations: [
      { name: 'Furniture Assembly & Installation', description: 'New furniture assembly, bed setup, wardrobe installation, table fitting, and wall shelf mounting.', icon: 'table_restaurant', basePrice: 349 },
      { name: 'Furniture Assembly & Setup', description: 'IKEA-style furniture assembly, modular kitchen installation, bookshelf setup, and TV unit mounting.', icon: 'table_restaurant', basePrice: 399 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // Cleaning & Pest Control (6 sub-items)
  // ═══════════════════════════════════════════════════════

  // 11. Bathroom & Kitchen Cleaning
  {
    category: 'Professional Cleaning',
    variations: [
      { name: 'Bathroom & Kitchen Deep Cleaning', description: 'Professional deep cleaning for bathrooms and kitchens — tile scrubbing, grout cleaning, chimney cleaning, and sanitization.', icon: 'countertops', basePrice: 899 },
      { name: 'Kitchen & Bathroom Cleaning Service', description: 'Complete kitchen degreasing, chimney cleaning, countertop scrubbing, and bathroom tile sanitization.', icon: 'countertops', basePrice: 999 },
    ],
  },
  // 12. Sofa & Carpet Cleaning
  {
    category: 'Professional Cleaning',
    variations: [
      { name: 'Sofa & Carpet Steam Cleaning', description: 'Professional steam cleaning for sofas, carpets, and upholstery. Removes stains, odors, and allergens.', icon: 'weekend', basePrice: 749 },
      { name: 'Sofa Deep Cleaning & Carpet Wash', description: 'Fabric sofa shampooing, carpet steam wash, cushion cleaning, and rug stain removal service.', icon: 'weekend', basePrice: 849 },
    ],
  },
  // 13. Full Home Cleaning
  {
    category: 'Professional Cleaning',
    variations: [
      { name: 'Full Home Deep Cleaning', description: 'Comprehensive 2BHK/3BHK deep cleaning — kitchen degreasing, bathroom scrubbing, floor mopping, and dusting.', icon: 'home', basePrice: 1499 },
      { name: 'Complete Home Cleaning Service', description: 'Full home sanitization and deep cleaning — all rooms, kitchen, bathrooms, balcony, and windows included.', icon: 'home', basePrice: 1699 },
    ],
  },
  // 14. Cockroach Control
  {
    category: 'Pest Control',
    variations: [
      { name: 'Cockroach & Ant Control', description: 'Gel-based and spray treatment for cockroach and ant infestation. Safe for kids and pets, 30-day warranty.', icon: 'pest_control', basePrice: 699 },
      { name: 'Cockroach Spray & Gel Treatment', description: 'Professional cockroach control using Bayer gel and herbal spray. Kitchen-safe formula with 45-day warranty.', icon: 'pest_control', basePrice: 799 },
    ],
  },
  // 15. Termite Control
  {
    category: 'Pest Control',
    variations: [
      { name: 'Termite Treatment & Control', description: 'Anti-termite chemical barrier treatment for walls, furniture, and wooden structures. 1-year warranty included.', icon: 'bug_report', basePrice: 999 },
      { name: 'Anti-Termite Wood Treatment', description: 'Deep termite control for doors, windows, and furniture. Chemical injection and soil treatment with 1-year warranty.', icon: 'bug_report', basePrice: 1199 },
    ],
  },
  // 16. General Pest Control
  {
    category: 'Pest Control',
    variations: [
      { name: 'General Pest Control Treatment', description: 'Complete pest control for mosquitoes, bed bugs, ants, and rodents. Whole-home fogging and spray treatment.', icon: 'pest_control', basePrice: 899 },
      { name: 'Mosquito & Rodent Control', description: 'Anti-mosquito fogging, rat trap installation, bed bug treatment, and comprehensive pest control service.', icon: 'pest_control', basePrice: 999 },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // Painting & Waterproofing (2 sub-items)
  // ═══════════════════════════════════════════════════════

  // 17. Full Home Painting
  {
    category: 'Painting',
    variations: [
      { name: 'Full Home Painting Service', description: 'Interior and exterior painting with premium emulsion paints. Includes wall preparation, primer, and 2 coats of paint.', icon: 'format_paint', basePrice: 4999 },
      { name: 'Home Interior & Wall Painting', description: 'Room-by-room painting with Asian Paints / Berger. Wall putty, primer coating, and 2-coat premium finish included.', icon: 'format_paint', basePrice: 5499 },
    ],
  },
  // 18. Waterproofing
  {
    category: 'Painting',
    variations: [
      { name: 'Waterproofing Solution', description: 'Terrace, bathroom, and wall waterproofing using Dr. Fixit and other premium chemicals. Prevents seepage and dampness.', icon: 'water_damage', basePrice: 2499 },
      { name: 'Waterproofing & Seepage Repair', description: 'Complete waterproofing for terrace, exterior walls, and bathrooms. Prevents leakage with 3-year warranty.', icon: 'water_damage', basePrice: 2999 },
    ],
  },
];

const seedServices = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('✅ Connected to MongoDB');

    // First, delete all old seeded services (from provider accounts)
    const allProviderEmails = Object.values(providerEmails).flat();
    const providerUsers = await User.find({ email: { $in: allProviderEmails } });
    const providerUserIds = providerUsers.map(u => u._id);

    const deleteResult = await Service.deleteMany({ providerId: { $in: providerUserIds } });
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} old provider services\n`);

    let totalCreated = 0;

    for (const [city, emails] of Object.entries(providerEmails)) {
      console.log(`\n🏙️  ${city}`);
      console.log('─'.repeat(55));

      for (let providerIndex = 0; providerIndex < emails.length; providerIndex++) {
        const email = emails[providerIndex];
        const user = await User.findOne({ email });

        if (!user) {
          console.log(`  ⚠️  User not found: ${email}, skipping...`);
          continue;
        }

        console.log(`  👤 ${user.name} (Provider ${providerIndex + 1})`);

        for (const serviceItem of allServices) {
          const template = serviceItem.variations[providerIndex];

          await Service.create({
            name: template.name,
            category: serviceItem.category,
            description: template.description,
            icon: template.icon,
            basePrice: template.basePrice,
            providerId: user._id,
            isActive: true,
            approvalStatus: 'approved',
          });

          console.log(`     ✅ [${serviceItem.category}] ${template.name} — ₹${template.basePrice}`);
          totalCreated++;
        }
      }
    }

    console.log('\n' + '═'.repeat(55));
    console.log(`🎉 Seeding complete!`);
    console.log(`   Total services created: ${totalCreated}`);
    console.log(`   Per provider: 18 services`);
    console.log(`   Per city: 36 services (18 × 2 providers)`);
    console.log(`   Per sub-item per city: 2 services (from 2 different providers)`);
    console.log('═'.repeat(55));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedServices();
