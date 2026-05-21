const router = require('express').Router();
const c = require('../controllers/rental.controller');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createRentalSchema } = require('../validators/rental.validator');

router.post('/', auth, validate(createRentalSchema), c.createRental);
router.get('/provider', auth, c.getProviderRentals);
router.get('/:id', auth, c.getRental);
router.put('/:id/status', auth, c.updateRentalStatus);

module.exports = router;
