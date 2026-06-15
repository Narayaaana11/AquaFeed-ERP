const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { getPOs, getPO, createPO, receivePO, cancelPO } = require('../controllers/purchaseOrderController');

router.use(protect);

router.get('/', getPOs);
router.get('/:id', getPO);
router.post('/', roleGuard('Owner', 'Manager'), createPO);
router.put('/:id/receive', roleGuard('Owner', 'Manager'), receivePO);
router.delete('/:id', roleGuard('Owner', 'Manager'), cancelPO);

module.exports = router;
