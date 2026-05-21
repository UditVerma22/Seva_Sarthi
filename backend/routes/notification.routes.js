const router = require('express').Router();
const c = require('../controllers/notification.controller');
const { auth } = require('../middleware/auth');

router.get('/', auth, c.getNotifications);
router.put('/:id/read', auth, c.markAsRead);
router.put('/read-all', auth, c.markAllAsRead);
router.delete('/', auth, c.clearAll);

module.exports = router;
