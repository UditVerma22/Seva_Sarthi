const router = require('express').Router();
const c = require('../controllers/booking.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { createBookingSchema, updateBookingStatusSchema } = require('../validators/booking.validator');

router.post('/', auth, authorize('user', 'provider'), validate(createBookingSchema), c.createBooking);
router.get('/:id', auth, c.getBooking);
router.get('/:id/tracking', auth, c.getBookingTracking);
router.put('/:id/status', auth, authorize('provider', 'admin'), validate(updateBookingStatusSchema), c.updateBookingStatus);
router.post('/:id/accept', auth, authorize('provider'), c.acceptBooking);
router.post('/:id/decline', auth, authorize('provider'), c.declineBooking);
router.put('/:id/reassign', auth, c.reassignProvider);

module.exports = router;
