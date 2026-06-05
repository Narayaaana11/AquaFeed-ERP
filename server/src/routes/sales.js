const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getInvoices, getInvoice, createInvoice, updateInvoiceStatus, deleteInvoice,
} = require('../controllers/salesController');

router.use(protect);

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.post('/', createInvoice);
router.put('/:id/status', roleGuard('Owner', 'Manager', 'Accountant'), updateInvoiceStatus);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteInvoice);

module.exports = router;
