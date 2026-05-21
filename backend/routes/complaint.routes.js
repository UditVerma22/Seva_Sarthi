const router = require('express').Router();
const c = require('../controllers/complaint.controller');
const { auth } = require('../middleware/auth');

// All complaint routes require authentication
router.use(auth);

// Customer routes
router.get('/references', c.getComplaintReferences);
router.post('/', c.createComplaint);
router.get('/my', c.getMyComplaints);
router.get('/:id', c.getComplaintById);
router.put('/:id/reopen', c.reopenComplaint);

module.exports = router;
