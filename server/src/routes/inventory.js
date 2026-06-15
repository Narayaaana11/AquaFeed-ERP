const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getInventory, getAdjustments, adjustInventory, getWarehouseInventory } = require('../controllers/inventoryController');

router.use(protect);
router.get('/', getInventory);
router.get('/adjustments', getAdjustments);
router.post('/adjust', adjustInventory);
router.get('/warehouse/:warehouseId', getWarehouseInventory);

module.exports = router;
