const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getExpenses, getExpense, createExpense, updateExpense, approveExpense, deleteExpense,
} = require('../controllers/expenseController');

router.use(protect);

router.get('/', getExpenses);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.put('/:id/approve', roleGuard('Owner', 'Manager'), approveExpense);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteExpense);

module.exports = router;
