const express = require('express');
const { asyncHandler } = require('../utils/async-handler');
const { requireAuth } = require('../middleware/auth');
const { create, list, readOne, remove, stats, update } = require('../controllers/todo-controller');

const router = express.Router();

router.get('/stats', requireAuth, asyncHandler(stats));
router.get('/', requireAuth, asyncHandler(list));
router.post('/', requireAuth, asyncHandler(create));
router.get('/:id', requireAuth, asyncHandler(readOne));
router.patch('/:id', requireAuth, asyncHandler(update));
router.delete('/:id', requireAuth, asyncHandler(remove));

module.exports = router;