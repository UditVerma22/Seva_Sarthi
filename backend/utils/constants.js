// User roles
const ROLES = {
  USER: 'user',
  PROVIDER: 'provider',
  ADMIN: 'admin',
};

// Booking statuses
const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EN_ROUTE: 'en_route',
  WORKING: 'working',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Tool statuses
const TOOL_STATUS = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance',
};

// Rental statuses
const RENTAL_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

// Complaint statuses
const COMPLAINT_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  REOPENED: 'reopened',
};

// Complaint types
const COMPLAINT_TYPES = {
  SERVICE_BOOKING: 'service_booking',
  TOOL_RENTAL: 'tool_rental',
};

// Complaint categories by type
const COMPLAINT_CATEGORIES = {
  service_booking: [
    'Provider No Show',
    'Poor Quality Work',
    'Overcharging',
    'Delayed Service',
    'Rude Behavior',
    'Property Damage',
    'Incomplete Work',
    'Other',
  ],
  tool_rental: [
    'Damaged Tool Received',
    'Wrong Tool Delivered',
    'Late Delivery',
    'Tool Malfunction',
    'Overcharged Deposit',
    'Missing Parts',
    'Return Not Processed',
    'Other',
  ],
};

// Admin actions on complaints
const ADMIN_ACTIONS = {
  WARNING_ISSUED: 'warning_issued',
  REFUND_INITIATED: 'refund_initiated',
  FREE_RESERVICE: 'free_reservice',
  TRUST_SCORE_REDUCED: 'trust_score_reduced',
  TEMPORARY_SUSPENSION: 'temporary_suspension',
  PERMANENT_BAN: 'permanent_ban',
  PENALTY_APPLIED: 'penalty_applied',
};

// Notification types
const NOTIFICATION_TYPES = {
  BOOKING: 'booking',
  RENTAL: 'rental',
  COMPLAINT: 'complaint',
  SYSTEM: 'system',
  OFFER: 'offer',
  ALERT: 'alert',
};

// Service categories
const SERVICE_CATEGORIES = [
  'Home Maintenance',
  'Professional Cleaning',
  'Electrical Works',
  'Gardening & Landscaping',
  'Plumbing',
  'Pest Control',
  'Painting',
  'Carpentry',
  'Appliance Repair',
  'Personal Care',
];

// Tool categories
const TOOL_CATEGORIES = [
  'Power Tools',
  'Hand Tools',
  'Construction',
  'Gardening',
];

// Business types
const BUSINESS_TYPES = {
  INDIVIDUAL: 'individual',
  SHOP: 'shop',
  AGENCY: 'agency',
};

// Provider verification status
const PROVIDER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Payment methods
const PAYMENT_METHODS = {
  ONLINE: 'online',
  CASH: 'cash_after_service',
};

// Payment statuses (Razorpay lifecycle)
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
};

module.exports = {
  ROLES,
  BOOKING_STATUS,
  TOOL_STATUS,
  RENTAL_STATUS,
  COMPLAINT_STATUS,
  COMPLAINT_TYPES,
  COMPLAINT_CATEGORIES,
  ADMIN_ACTIONS,
  NOTIFICATION_TYPES,
  SERVICE_CATEGORIES,
  TOOL_CATEGORIES,
  BUSINESS_TYPES,
  PROVIDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
};
