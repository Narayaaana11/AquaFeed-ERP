const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getInvoices, getInvoice, createInvoice, updateInvoiceStatus, deleteInvoice, addPayment
} = require('../controllers/salesController');

router.use(protect);

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.post('/', createInvoice);
router.post('/:id/payments', roleGuard('Owner', 'Manager', 'Accountant'), addPayment);
router.put('/:id/status', roleGuard('Owner', 'Manager', 'Accountant'), updateInvoiceStatus);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteInvoice);

module.exports = router;
