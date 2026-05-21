const router = require('express').Router();
const {
  getAllServices,
  getService,
  getMyServices,
  createService,
  updateService,
  toggleServiceActive,
  deleteService,
} = require('../controllers/service.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Public routes
router.get('/', getAllServices);

// Provider routes (must be above /:id to avoid conflict)
router.get('/my-services', auth, authorize('provider'), getMyServices);
router.post('/', auth, authorize('provider'), createService);
router.put('/:id', auth, authorize('provider'), updateService);
router.put('/:id/toggle-active', auth, authorize('provider'), toggleServiceActive);
router.delete('/:id', auth, authorize('provider'), deleteService);

// Public single service
router.get('/:id', getService);

module.exports = router;
