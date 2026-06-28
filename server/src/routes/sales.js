const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, updateInvoiceStatus, deleteInvoice, addPayment, getPaymentHistory
} = require('../controllers/salesController');

router.use(protect);

router.get('/', getInvoices);
router.get('/payments/history', getPaymentHistory);
router.get('/:id', getInvoice);
router.post('/', createInvoice);
router.put('/:id', roleGuard('Owner', 'Manager'), updateInvoice);
router.post('/:id/payments', roleGuard('Owner', 'Manager', 'Accountant'), addPayment);
router.put('/:id/status', roleGuard('Owner', 'Manager', 'Accountant'), updateInvoiceStatus);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteInvoice);

module.exports = router;

