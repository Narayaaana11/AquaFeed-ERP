const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getQuotations, getQuotation, createQuotation, updateQuotation, updateQuotationStatus, deleteQuotation, convertToInvoice
} = require('../controllers/quotationController');

router.use(protect);

router.get('/', getQuotations);
router.get('/:id', getQuotation);
router.post('/', createQuotation);
router.put('/:id', roleGuard('Owner', 'Manager'), updateQuotation);
router.put('/:id/status', roleGuard('Owner', 'Manager', 'Accountant'), updateQuotationStatus);
router.post('/:id/convert', roleGuard('Owner', 'Manager'), convertToInvoice);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteQuotation);

module.exports = router;
