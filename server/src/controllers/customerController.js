const Customer = require('../models/Customer');
const { emitCustomerCreated, emitCustomerUpdate, emitCustomerDeleted } = require('../utils/websocket');

// GET /api/customers
const getCustomers = async (req, res, next) => {
  try {
    const { search, type } = req.query;
    const query = { company: req.companyId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (type && type !== 'All') query.type = type;

    const customers = await Customer.find(query).sort({ name: 1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, company: req.companyId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create({ ...req.body, company: req.companyId });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitCustomerCreated(io, req.companyId, customer);
    }

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitCustomerUpdate(io, req.companyId, customer);
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const Invoice = require('../models/Invoice');
    const activeInvoices = await Invoice.countDocuments({
      customer: req.params.id,
      company: req.companyId,
      status: { $in: ['Credit', 'Overdue', 'Pending'] }
    });
    if (activeInvoices > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with ${activeInvoices} active invoice(s). Settle or cancel them first.`
      });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { isActive: false },
      { new: true }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitCustomerDeleted(io, req.companyId, customer._id);
    }

    res.json({ success: true, message: 'Customer deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/overdue
const getOverdueCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find({
      company: req.companyId,
      isActive: true,
      outstandingBalance: { $gt: 0 },
    }).sort({ outstandingBalance: -1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id/ledger
const getCustomerLedger = async (req, res, next) => {
  try {
    const Invoice = require('../models/Invoice');

    const customer = await Customer.findOne({ _id: req.params.id, company: req.companyId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const invoices = await Invoice.find({
      customer: req.params.id,
      company: req.companyId,
      status: { $nin: ['Cancelled'] },
    }).sort({ createdAt: 1 });

    let runningBalance = 0;
    const entries = invoices.map((inv) => {
      const debit = inv.total;
      const credit = inv.paidAmount || 0;
      runningBalance += debit - credit;
      return {
        date: inv.createdAt,
        invoiceNumber: inv.invoiceNumber,
        type: inv.status,
        debit,
        credit,
        balance: runningBalance,
        _id: inv._id,
      };
    });

    res.json({
      success: true,
      data: {
        customer,
        entries,
        totalOutstanding: runningBalance,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getOverdueCustomers, getCustomerLedger };

