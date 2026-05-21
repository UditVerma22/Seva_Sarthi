require('dotenv').config();
const mongoose = require('mongoose');
const Provider = require('../models/Provider');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB');

  const res = await Provider.updateMany({}, {
    $set: {
      rating: 0,
      reviewCount: 0,
      jobsCompleted: 0,
      isTopRated: false,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
  });

  console.log(`✅ Reset ${res.modifiedCount} providers — rating, reviewCount, jobsCompleted all set to 0`);
  process.exit(0);
})();
