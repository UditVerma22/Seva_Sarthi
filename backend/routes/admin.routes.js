const router = require('express').Router();
const c = require('../controllers/admin.controller');
const cc = require('../controllers/complaint.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(auth, authorize('admin'));

router.get('/stats', c.getStats);
router.get('/users', c.getAllUsers);
router.put('/users/:id/toggle-status', c.toggleUserStatus);
router.delete('/users/:id', c.deleteUser);
router.get('/verifications', c.getVerifications);
router.put('/verifications/:id', c.handleVerification);
router.get('/bookings', c.getAllBookings);
router.get('/analytics', c.getAnalytics);
router.get('/services', c.getAllServices);
router.post('/services', c.createService);
router.delete('/services/:id', c.deleteService);

// Service approval
router.get('/pending-services', c.getPendingServices);
router.put('/services/:id/approve', c.approveService);
router.put('/services/:id/reject', c.rejectService);

// Complaint management (admin)
router.get('/complaints', cc.getAllComplaints);
router.get('/complaints/:id', cc.getAdminComplaintById);
router.put('/complaints/:id/status', cc.updateComplaintStatus);
router.put('/complaints/:id/action', cc.takeAdminAction);

module.exports = router;
