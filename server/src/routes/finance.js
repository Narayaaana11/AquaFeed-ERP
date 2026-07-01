const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLedger, getJournal, getBankBook, getOutstanding } = require('../controllers/financeController');

router.use(protect);

router.get('/ledger', getLedger);
router.get('/journal', getJournal);
router.get('/bank-book', getBankBook);
router.get('/outstanding', getOutstanding);

module.exports = router;
