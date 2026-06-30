const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const FinancialMetric = require('../models/FinancialMetric');
const { emitDashboardUpdate, emitLowStockAlert } = require('../utils/websocket');

// GET /api/reports/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const { range = 'month' } = req.query;
    const companyId = req.companyId;
    const now = new Date();

    let startDate, prevStartDate;
    if (range === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else if (range === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), q * 3, 1);
      prevStartDate = new Date(now.getFullYear(), q * 3 - 3, 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
    }

    const [
      currentSales,
      prevSales,
      totalProducts,
      lowStockCount,
      totalCustomers,
      totalExpenses,
      recentInvoices,
      overdueCount,
      lowStockProducts,
      financialMetrics,
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { company: companyId, status: { $in: ['Paid', 'Credit'] }, date: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: companyId, status: { $in: ['Paid', 'Credit'] }, date: { $gte: prevStartDate, $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Product.countDocuments({ company: companyId, isActive: true }),
      Product.countDocuments({ company: companyId, isActive: true, $expr: { $lt: ['$stock', '$lowStockThreshold'] } }),
      Customer.countDocuments({ company: companyId, isActive: true }),
      Expense.aggregate([
        { $match: { company: companyId, status: 'Approved', date: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.find({ company: companyId })
        .populate('customer', 'name')
        .sort({ date: -1, createdAt: -1 })
        .limit(5),
      Invoice.countDocuments({ company: companyId, status: 'Overdue' }),
      Product.find({ company: companyId, isActive: true, $expr: { $lt: ['$stock', '$lowStockThreshold'] } }).limit(10),
      FinancialMetric.findOne({ company: companyId }),
    ]);

    const currentTotal = currentSales[0]?.total || 0;
    const prevTotal = prevSales[0]?.total || 0;
    const salesChange = prevTotal > 0 ? (((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1) : 0;

    const dashboardData = {
      success: true,
      data: {
        kpis: {
          sales: { value: currentTotal, count: currentSales[0]?.count || 0, change: parseFloat(salesChange) },
          products: { value: totalProducts },
          lowStock: { value: lowStockCount },
          customers: { value: totalCustomers },
          expenses: { value: totalExpenses[0]?.total || 0 },
          overdue: { value: overdueCount },
          financialMetrics: financialMetrics || {
            cashInHand: 0,
            bankAccounts: 0,
            currentAssets: 0,
            currentLiabilities: 0,
            workingCapital: 0,
            capitalAccount: 0,
            loansLiability: 0,
            receivables: 0,
            payables: 0
          }
        },
        recentSales: recentInvoices,
      },
    };

    // Emit real-time update via WebSocket
    const io = req.app.locals.io;
    if (io) {
      emitDashboardUpdate(io, companyId, dashboardData.data);
      if (lowStockProducts.length > 0) {
        emitLowStockAlert(io, companyId, lowStockProducts);
      }
    }

    res.json(dashboardData);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/sales-trend
const getSalesTrend = async (req, res, next) => {
  try {
    const { range = 'year' } = req.query;
    const companyId = req.companyId;
    const now = new Date();

    let groupBy, matchFrom;
    if (range === 'week') {
      matchFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } };
    } else if (range === 'month') {
      matchFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' }, day: { $dayOfMonth: '$date' } };
    } else if (range === '3months') {
      matchFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' } };
    } else if (range === '6months') {
      matchFrom = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' } };
    } else if (range === '12months') {
      matchFrom = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' } };
    } else {
      matchFrom = new Date(now.getFullYear(), 0, 1);
      groupBy = { year: { $year: '$date' }, month: { $month: '$date' } };
    }

    const salesTrendPromise = Invoice.aggregate([
      {
        $match: {
          company: companyId,
          status: { $in: ['Paid', 'Credit'] },
          date: { $gte: matchFrom },
        },
      },
      {
        $group: {
          _id: groupBy,
          sales: { $sum: '$total' },
          count: { $sum: 1 },
          gstAmount: { $sum: '$gstAmount' },
          cgstAmount: { $sum: '$cgstAmount' },
          sgstAmount: { $sum: '$sgstAmount' },
          igstAmount: { $sum: '$igstAmount' },
        },
      },
    ]);

    const expenseTrendPromise = Expense.aggregate([
      {
        $match: {
          company: companyId,
          status: 'Approved',
          date: { $gte: matchFrom },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: groupBy.day ? { $dayOfMonth: '$date' } : undefined,
          },
          expenses: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const [salesTrend, expenseTrend] = await Promise.all([salesTrendPromise, expenseTrendPromise]);

    const mergedMap = {};

    salesTrend.forEach(item => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day || 0}`;
      mergedMap[key] = {
        _id: item._id,
        sales: item.sales,
        gstAmount: item.gstAmount || 0,
        cgstAmount: item.cgstAmount || 0,
        sgstAmount: item.sgstAmount || 0,
        igstAmount: item.igstAmount || 0,
        expenses: 0
      };
    });

    expenseTrend.forEach(item => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day || 0}`;
      if (!mergedMap[key]) {
        mergedMap[key] = {
          _id: item._id,
          sales: 0,
          gstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          expenses: item.expenses
        };
      } else {
        mergedMap[key].expenses = item.expenses;
      }
    });

    const combined = Object.values(mergedMap).sort((a, b) => {
      if (a._id.year !== b._id.year) return a._id.year - b._id.year;
      if (a._id.month !== b._id.month) return a._id.month - b._id.month;
      return (a._id.day || 0) - (b._id.day || 0);
    });

    res.json({ success: true, data: combined });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/top-products
const getTopProducts = async (req, res, next) => {
  try {
    const { limit = 5, from } = req.query;
    const companyId = req.companyId;
    const matchFrom = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);

    const top = await Invoice.aggregate([
      { $match: { company: companyId, status: { $in: ['Paid', 'Credit'] }, date: { $gte: matchFrom } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({ success: true, data: top });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/inventory-value
const getInventoryValue = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const breakdown = await Product.aggregate([
      { $match: { company: companyId, isActive: true } },
      {
        $group: {
          _id: '$category',
          value: { $sum: { $multiply: ['$stock', '$price'] } },
          qty: { $sum: '$stock' },
        },
      },
      { $sort: { value: -1 } },
    ]);

    const totalValue = breakdown.reduce((sum, b) => sum + b.value, 0);
    const enriched = breakdown.map((b) => ({
      name: b._id || 'Other',
      value: b.value,
      qty: b.qty,
      percentage: totalValue > 0 ? parseFloat(((b.value / totalValue) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, data: enriched, totalValue });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/expense-breakdown
const getExpenseBreakdown = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const companyId = req.companyId;
    const match = { company: companyId, status: 'Approved' };
    if (from) match.date = { ...match.date, $gte: new Date(from) };
    if (to) match.date = { ...match.date, $lte: new Date(to + 'T23:59:59.999Z') };

    const breakdown = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: breakdown.map((b) => ({ name: b._id, value: b.total, count: b.count })) });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/customer-outstanding
const getCustomerOutstanding = async (req, res, next) => {
  try {
    const customers = await Customer.find({
      company: req.companyId,
      isActive: true,
      outstandingBalance: { $gt: 0 },
    }).sort({ outstandingBalance: -1 }).limit(10);

    res.json({ success: true, data: customers });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/export-csv
const exportCSV = async (req, res, next) => {
  try {
    const { type = 'sales', from, to } = req.query;
    const companyId = req.companyId;
    const match = { company: companyId };
    if (from) match.date = { $gte: new Date(from) };
    if (to) match.date = { ...match.date, $lte: new Date(to + 'T23:59:59.999Z') };

    let rows = [];
    let headers = [];

    if (type === 'sales') {
      const invoices = await Invoice.find(match).sort({ date: -1, createdAt: -1 });
      headers = ['Invoice No', 'Customer', 'Date', 'Subtotal', 'GST', 'Total', 'Payment Type', 'Status'];
      rows = invoices.map((inv) => [
        inv.invoiceNumber,
        inv.customerName,
        (inv.date || inv.createdAt).toLocaleDateString('en-IN'),
        inv.subtotal,
        inv.gstAmount,
        inv.total,
        inv.paymentType,
        inv.status,
      ]);
    } else if (type === 'expenses') {
      match.status = 'Approved';
      const expenses = await Expense.find(match).sort({ date: -1 });
      headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Status'];
      rows = expenses.map((e) => [
        new Date(e.date).toLocaleDateString('en-IN'),
        e.category,
        e.description,
        e.amount,
        e.paymentMethod,
        e.status,
      ]);
    }

    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/profit-loss?from=&to=
const getProfitLoss = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { from, to } = req.query;

    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { $gte: startDate, $lte: endDate };

    // Revenue = sum of all non-cancelled invoices in range
    const revenueResult = await Invoice.aggregate([
      { $match: { company: companyId, status: { $in: ['Paid', 'Credit', 'Overdue', 'Pending'] }, date: dateFilter } },
      { $group: { _id: null, total: { $sum: '$total' }, subtotal: { $sum: '$subtotal' }, gstTotal: { $sum: '$gstAmount' } } },
    ]);

    // COGS using purchasePrice from Product
    const cogsResult = await Invoice.aggregate([
      { $match: { company: companyId, status: { $in: ['Paid', 'Credit', 'Overdue', 'Pending'] }, date: dateFilter } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData',
        },
      },
      { $unwind: { path: '$productData', preserveNullAndEmpty: true } },
      {
        $group: {
          _id: null,
          cogs: {
            $sum: {
              $multiply: ['$items.quantity', { $ifNull: ['$productData.purchasePrice', 0] }],
            },
          },
        },
      },
    ]);

    // Operating expenses
    const expensesResult = await Expense.aggregate([
      { $match: { company: companyId, status: 'Approved', date: dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const subtotalRevenue = revenueResult[0]?.subtotal || 0;
    const gstCollected = revenueResult[0]?.gstTotal || 0;
    const cogs = cogsResult[0]?.cogs || 0;
    const grossProfit = subtotalRevenue - cogs;
    const operatingExpenses = expensesResult[0]?.total || 0;
    const netProfit = grossProfit - operatingExpenses;
    const grossMargin = subtotalRevenue > 0 ? ((grossProfit / subtotalRevenue) * 100).toFixed(1) : '0';
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0';

    res.json({
      success: true,
      data: {
        period: { from: startDate, to: endDate },
        revenue,
        subtotalRevenue,
        gstCollected,
        cogs,
        grossProfit,
        grossMargin: parseFloat(grossMargin),
        operatingExpenses,
        netProfit,
        netMargin: parseFloat(netMargin),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getSalesTrend, getTopProducts, getInventoryValue, getExpenseBreakdown, getCustomerOutstanding, exportCSV, getProfitLoss };

