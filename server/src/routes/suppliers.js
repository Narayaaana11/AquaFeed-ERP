const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');

router.use(protect);

router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.post('/', roleGuard('Owner', 'Manager'), createSupplier);
router.put('/:id', roleGuard('Owner', 'Manager'), updateSupplier);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteSupplier);

module.exports = router;
