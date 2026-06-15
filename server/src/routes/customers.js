const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getCustomers, getCustomer, createCustomer, updateCustomer,
  deleteCustomer, getOverdueCustomers, getCustomerLedger,
} = require('../controllers/customerController');

router.use(protect);

router.get('/overdue', getOverdueCustomers);
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.get('/:id/ledger', getCustomerLedger);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteCustomer);

module.exports = router;
