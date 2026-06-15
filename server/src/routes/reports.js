const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getDashboard, getSalesTrend, getTopProducts,
  getInventoryValue, getExpenseBreakdown, getCustomerOutstanding, exportCSV, getProfitLoss,
} = require('../controllers/reportsController');

router.use(protect);
router.get('/dashboard', getDashboard);
router.get('/sales-trend', getSalesTrend);
router.get('/top-products', getTopProducts);
router.get('/inventory-value', getInventoryValue);
router.get('/expense-breakdown', getExpenseBreakdown);
router.get('/customer-outstanding', getCustomerOutstanding);
router.get('/export-csv', exportCSV);
router.get('/profit-loss', getProfitLoss);

module.exports = router;
