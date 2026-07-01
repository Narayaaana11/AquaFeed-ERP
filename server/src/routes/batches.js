const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getBatches, getBatch } = require('../controllers/batchController');

router.use(protect);

router.get('/', getBatches);
router.get('/:id', getBatch);

module.exports = router;
