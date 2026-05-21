// src/lib/constants.js
// Maps UI categories → actual DB categories for strong filtering

export const heroCategories = [
  {
    id: 'appliance',
    title: "AC & Appliance Repair",
    icon: "ac_unit",
    modal: [
      {
        subtitle: "Large appliances",
        items: [
          { name: "AC", icon: "ac_unit", dbCategory: "Appliance Repair", keywords: ["ac", "air conditioner", "air conditioning", "split ac", "window ac", "ac servicing", "ac repair", "ac cleaning", "ac gas", "thanda", "thandi"] },
          { name: "Washing Machine", icon: "local_laundry_service", dbCategory: "Appliance Repair", keywords: ["washing machine", "washer", "laundry", "dhulai", "kapde"] },
          { name: "Refrigerator Repair", icon: "kitchen", dbCategory: "Appliance Repair", keywords: ["fridge", "refrigerator", "freezer", "fridge repair"] },
        ]
      },
      {
        subtitle: "Other appliances",
        items: [
          { name: "Microwave", icon: "microwave", dbCategory: "Appliance Repair", keywords: ["microwave", "oven", "microwave oven"] },
          { name: "RO/Water Purifier", icon: "water_drop", dbCategory: "Appliance Repair", keywords: ["ro", "water purifier", "water filter", "purifier", "ro service"] },
          { name: "Geyser", icon: "hot_tub", dbCategory: "Appliance Repair", keywords: ["geyser", "water heater", "heater", "garam pani"] },
        ]
      }
    ]
  },
  {
    id: 'repairs',
    title: "Electrician, Plumber & Carpenter",
    icon: "construction",
    modal: [
      {
        subtitle: "Home repairs",
        items: [
          { name: "Electrician", icon: "electrical_services", dbCategory: "Electrical Works", keywords: ["electrician", "wire", "switch", "fan", "light", "electrical", "wiring", "mcb", "bijli", "bijli wala", "pankha", "bijlee"] },
          { name: "Plumber", icon: "plumbing", dbCategory: "Plumbing", keywords: ["plumber", "pipe", "leak", "tap", "sink", "water", "plumbing", "drain", "nalkaa", "nal", "pani wala", "nali", "paip"] },
          { name: "Carpenter", icon: "carpenter", dbCategory: "Carpentry", keywords: ["carpenter", "wood", "furniture", "door", "cabinet", "carpentry", "mistri", "lakdi", "darwaza", "almari"] },
        ]
      },
      {
        subtitle: "Home installation",
        items: [
          { name: "Furniture Assembly", icon: "table_restaurant", dbCategory: "Carpentry", keywords: ["furniture", "assembly", "install", "setup", "table", "bed", "almaari"] },
        ]
      }
    ]
  },
  {
    id: 'cleaning-pest',
    title: "Cleaning & Pest Control",
    icon: "cleaning_services",
    modal: [
      {
        subtitle: "Deep Cleaning",
        items: [
          { name: "Bathroom & Kitchen Cleaning", icon: "countertops", dbCategory: "Professional Cleaning", keywords: ["bathroom", "kitchen", "toilet", "washroom", "chimney", "countertop", "bathroom safai"] },
          { name: "Sofa & Carpet Cleaning", icon: "weekend", dbCategory: "Professional Cleaning", keywords: ["sofa", "carpet", "upholstery", "fabric", "steam", "couch", "rug", "sofa safai"] },
          { name: "Full Home Cleaning", icon: "home", dbCategory: "Professional Cleaning", keywords: ["full home", "2bhk", "3bhk", "whole house", "complete home", "poora ghar", "ghar safai"] },
        ]
      },
      {
        subtitle: "Pest Control",
        items: [
          { name: "Cockroach Control", icon: "pest_control", dbCategory: "Pest Control", keywords: ["cockroach", "roach", "spray", "makodi", "cockroach marna"] },
          { name: "Termite Control", icon: "bug_report", dbCategory: "Pest Control", keywords: ["termite", "anti-termite", "deemak", "white ant"] },
          { name: "General Pest Control", icon: "pest_control", dbCategory: "Pest Control", keywords: ["mosquito", "bed bug", "ant", "rat", "rodent", "keede", "macchar", "chuha"] },
        ]
      }
    ]
  },
  {
    id: 'painting',
    title: "Painting & Waterproofing",
    icon: "format_paint",
    modal: [
      {
        subtitle: null,
        items: [
          { name: "Full Home Painting", icon: "format_paint", dbCategory: "Painting", keywords: ["paint", "home", "wall", "full", "room", "rang", "rangai", "deewar"] },
          { name: "Waterproofing", icon: "water_damage", dbCategory: "Painting", keywords: ["waterproof", "seepage", "leak", "wall", "terrace", "pani rishna"] },
        ]
      }
    ]
  }
];

// Extra categories shown only in "All services" modal (Currently empty for simplified MVP)
export const extraCategories = [];

// Combined list for "All services" modal
export const allCategories = [...heroCategories, ...extraCategories];

// Helper: get all flat items from a category
export function getCategoryItems(cat) {
  const items = [];
  cat.modal.forEach(section => {
    section.items.forEach(item => items.push(item));
  });
  return items;
}

// Kept for backward compat with ToolRentalPage
export const toolCategoriesMap = [
  {
    title: "Power Tools",
    items: [
      { name: "Drills & Drivers", search: "drill", icon: "construction", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=200&auto=format&fit=crop" },
      { name: "Saws & Grinders", search: "saw", icon: "carpenter", image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?q=80&w=200&auto=format&fit=crop" }
    ]
  },
  {
    title: "Hand Tools",
    items: [
      { name: "Wrenches & Pliers", search: "wrench", icon: "build", image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?q=80&w=200&auto=format&fit=crop" },
      { name: "Hammers & Mallets", search: "hammer", icon: "hardware", image: "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?q=80&w=200&auto=format&fit=crop" }
    ]
  },
  {
    title: "Construction & Outdoor",
    items: [
      { name: "Ladders", search: "ladder", icon: "stairs", image: "https://images.unsplash.com/photo-1416879598555-fa7dc51375d8?q=80&w=200&auto=format&fit=crop" },
      { name: "Gardening Tools", search: "garden", icon: "yard", image: "https://images.unsplash.com/photo-1416879598555-fa7dc51375d8?q=80&w=200&auto=format&fit=crop" }
    ]
  }
];

// ─────────────────────────────────────────────────────────
// NEW MOCK DATA FOR HOMEPAGE REDESIGN (Urban Company Style)
// ─────────────────────────────────────────────────────────

export const mostBookedServices = [
  { id: 1, title: "Intense Cleaning (2 Bathrooms)", rating: "4.8", reviews: "12K", price: "₹899", originalPrice: "₹1299", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=500&auto=format&fit=crop", category: "Cleaning" },
  { id: 2, title: "AC Service & Repair (Split/Window)", rating: "4.7", reviews: "25K", price: "₹499", originalPrice: "₹699", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=500&auto=format&fit=crop", category: "Appliance Repair" },
  { id: 3, title: "Classic Salon Package for Women", rating: "4.9", reviews: "30K", price: "₹1,249", originalPrice: "₹1899", image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=500&auto=format&fit=crop", category: "Salon" },
  { id: 4, title: "Deep Tissue Massage for Men", rating: "4.8", reviews: "10K", price: "₹999", originalPrice: "₹1499", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=500&auto=format&fit=crop", category: "Massage" },
  { id: 5, title: "Sofa Deep Cleaning (3 Seater)", rating: "4.6", reviews: "8K", price: "₹749", originalPrice: "₹999", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=500&auto=format&fit=crop", category: "Cleaning" },
  { id: 6, title: "Plumbing Minor Repairs", rating: "4.7", reviews: "18K", price: "₹199", originalPrice: "₹299", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=500&auto=format&fit=crop", category: "Plumbing" },
];

export const categoryShowcases = [
  {
    id: "repairs",
    title: "Home Repairs",
    subtitle: "Electricians, Plumbers & Carpenters",
    items: [
      { id: 101, title: "Switch & Board Repair", price: "₹99", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop" },
      { id: 102, title: "Tap & Pipe Leakage", price: "₹149", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=400&auto=format&fit=crop" },
      { id: 103, title: "Fan Installation", price: "₹199", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop" },
      { id: 104, title: "Furniture Assembly", price: "₹299", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop" },
    ]
  },
  {
    id: "cleaning",
    title: "Cleaning & Pest Control",
    subtitle: "Make your home shine like new",
    items: [
      { id: 201, title: "Full Home Deep Cleaning", price: "₹2,499", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop" },
      { id: 202, title: "Bathroom Cleaning", price: "₹499", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop" },
      { id: 203, title: "Sofa Cleaning", price: "₹749", image: "https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=400&auto=format&fit=crop" },
      { id: 204, title: "General Pest Control", price: "₹899", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=400&auto=format&fit=crop" },
    ]
  },
  {
    id: "appliance",
    title: "Appliance Repair & Service",
    subtitle: "Expert technicians at your doorstep",
    items: [
      { id: 301, title: "AC Service & Repair", price: "₹499", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop" },
      { id: 302, title: "Washing Machine Repair", price: "₹349", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop" },
      { id: 303, title: "Refrigerator Repair", price: "₹299", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop" },
      { id: 304, title: "Water Purifier Service", price: "₹249", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=400&auto=format&fit=crop" },
    ]
  }
];

export const newAndNoteworthy = [
  { id: 1, title: "Native Water Purifier", badge: "NEW LAUNCH", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop", color: "bg-teal-900", textColor: "text-white" },
  { id: 2, title: "Smart Locks Installation", badge: "POPULAR", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop", color: "bg-slate-900", textColor: "text-white" },
  { id: 3, title: "Festive Home Painting", badge: "OFFER", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop", color: "bg-rose-900", textColor: "text-white" },
];
