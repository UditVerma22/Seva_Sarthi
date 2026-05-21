const router = require('express').Router();
const c = require('../controllers/provider.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', c.getAllProviders);
router.get('/onboarding-status', auth, authorize('provider'), c.getOnboardingStatus);
router.get('/requests', auth, authorize('provider'), c.getPendingRequests);
router.get('/dashboard', auth, authorize('provider'), c.getDashboardStats);
router.get('/schedule', auth, authorize('provider'), c.getTodaySchedule);
router.get('/earnings', auth, authorize('provider'), c.getEarnings);
router.put('/profile', auth, authorize('provider'), c.updateProviderProfile);
router.put('/availability', auth, authorize('provider'), c.toggleAvailability);
router.get('/:id/available-slots', c.getProviderAvailableSlots);
router.get('/:id', c.getProvider);

module.exports = router;
