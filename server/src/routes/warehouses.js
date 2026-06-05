const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse,
} = require('../controllers/warehouseController');

router.use(protect);
router.get('/', getWarehouses);
router.get('/:id', getWarehouse);
router.post('/', roleGuard('Owner', 'Manager'), createWarehouse);
router.put('/:id', roleGuard('Owner', 'Manager'), updateWarehouse);
router.delete('/:id', roleGuard('Owner'), deleteWarehouse);

module.exports = router;
