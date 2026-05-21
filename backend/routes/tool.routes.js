const router = require('express').Router();
const c = require('../controllers/tool.controller');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { createToolSchema, updateToolSchema } = require('../validators/tool.validator');

router.get('/', c.getAllTools);
router.get('/my-tools', auth, authorize('provider'), c.getMyTools);
router.get('/:id', c.getTool);
router.post('/', auth, authorize('provider'), validate(createToolSchema), c.createTool);
router.put('/:id', auth, authorize('provider'), validate(updateToolSchema), c.updateTool);
router.put('/:id/toggle-status', auth, authorize('provider'), c.toggleToolStatus);
router.delete('/:id', auth, c.deleteTool);

module.exports = router;
