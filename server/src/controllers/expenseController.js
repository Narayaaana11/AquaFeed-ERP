const Expense = require('../models/Expense');
const { emitExpenseCreated, emitExpenseUpdated, emitExpenseDeleted, emitDashboardUpdate } = require('../utils/websocket');

// GET /api/expenses
const getExpenses = async (req, res, next) => {
  try {
    const { search, category, status, from, to, page = 1, limit = 50 } = req.query;
    const query = { company: req.companyId };

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('submittedBy', 'name')
        .populate('approvedBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(query),
    ]);

    res.json({ success: true, data: expenses, total });
  } catch (err) {
    next(err);
  }
};

// GET /api/expenses/:id
const getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, company: req.companyId });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    res.json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
const createExpense = async (req, res, next) => {
  try {
    const isOwnerOrManager = ['Owner', 'Manager'].includes(req.user.role);
    const expense = await Expense.create({
      ...req.body,
      company: req.companyId,
      submittedBy: req.user._id,
      status: isOwnerOrManager ? 'Approved' : 'Pending Approval',
      approvedBy: isOwnerOrManager ? req.user._id : undefined,
    });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitExpenseCreated(io, req.companyId, expense);
      if (isOwnerOrManager) {
        emitDashboardUpdate(io, req.companyId, { event: 'expense_created', amount: expense.amount });
      }
    }

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitExpenseUpdated(io, req.companyId, expense);
    }

    res.json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id/approve
const approveExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { status: 'Approved', approvedBy: req.user._id },
      { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitExpenseUpdated(io, req.companyId, expense);
      emitDashboardUpdate(io, req.companyId, { event: 'expense_approved', amount: expense.amount });
    }

    res.json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitExpenseDeleted(io, req.companyId, expense._id);
    }

    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getExpenses, getExpense, createExpense, updateExpense, approveExpense, deleteExpense };
