const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTrialBalance, getProfitLoss, getBalanceSheet, getGstSummary } = require('../controllers/advancedReportsController');

router.use(protect);

router.get('/trial-balance', getTrialBalance);
router.get('/profit-loss', getProfitLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/gst-summary', getGstSummary);

module.exports = router;
