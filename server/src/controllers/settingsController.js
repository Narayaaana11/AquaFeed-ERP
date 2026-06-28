const Company = require('../models/Company');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const StockAdjustment = require('../models/StockAdjustment');

// GET /api/settings/company
const getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId);
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

// PUT /api/settings/company
const updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(req.companyId, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

// GET /api/settings/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ company: req.companyId }).select('-password').sort({ createdAt: 1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// POST /api/settings/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists.' });
    const user = await User.create({ name, email, password, role, phone, company: req.companyId });
    const safe = { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive };
    res.status(201).json({ success: true, data: safe });
  } catch (err) { next(err); }
};

// PUT /api/settings/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { name, role, phone, isActive } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { name, role, phone, isActive },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PUT /api/settings/profile  (current user)
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// POST /api/settings/load-demo
const loadDemoData = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const userId = req.user._id;

    // Clear existing company data first to prevent duplicate key or messy dashboard
    await Promise.all([
      Product.deleteMany({ company: companyId }),
      Customer.deleteMany({ company: companyId }),
      Invoice.deleteMany({ company: companyId }),
      Expense.deleteMany({ company: companyId }),
      Warehouse.deleteMany({ company: companyId }),
      Inventory.deleteMany({ company: companyId }),
      StockAdjustment.deleteMany({ company: companyId }),
    ]);

    // Create Warehouses
    const warehouse1 = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: '12, Fish Market Road',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      manager: req.user.name,
      phone: req.user.phone || '9876543210',
      capacity: 500,
      status: 'Active',
      isDefault: true,
      company: companyId,
    });

    const warehouse2 = await Warehouse.create({
      name: 'Branch Store',
      code: 'WH-BRNCH',
      address: '45, Market Street',
      city: 'Guntur',
      state: 'Andhra Pradesh',
      manager: req.user.name,
      phone: req.user.phone || '9876543210',
      capacity: 200,
      status: 'Active',
      isDefault: false,
      company: companyId,
    });

    // Create Products
    const productsData = [
      { name: 'Growel Floating Fish Feed 4mm', brand: 'Growel Feeds', category: 'Floating Fish Feed', pelletSize: '4mm', weight: 50, price: 3200, purchasePrice: 2600, stock: 120, lowStockThreshold: 20, imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2022/9/MJ/GD/DA/3948456/growel-floating-fish-feed-500x500.jpg' },
      { name: 'Avanti Manamei Vannamei Starter S1', brand: 'Avanti Feeds', category: 'Shrimp Feed (Vannamei)', pelletSize: '1.2mm', weight: 25, price: 2800, purchasePrice: 2200, stock: 85, lowStockThreshold: 20, imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2022/11/EM/LI/KH/8855308/avanti-manamei-fish-feed-500x500.jpg' },
      { name: 'CP Scampi Grower 3mm', brand: 'CP Aquaculture', category: 'Scampi Feed', pelletSize: '3mm', weight: 10, price: 1600, purchasePrice: 1200, stock: 6, lowStockThreshold: 15, imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2023/2/280988721/LF/HE/GX/8672308/cp-shrimp-feed-500x500.jpg' },
      { name: 'Cargill Sinking Rohu Finisher', brand: 'Cargill', category: 'Sinking Fish Feed', pelletSize: '6mm', weight: 50, price: 3900, purchasePrice: 3100, stock: 43, lowStockThreshold: 20, imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2022/7/TW/LB/HJ/6182744/cargill-aqua-fish-feed-500x500.jpg' },
      { name: 'ABIS Pangasius Starter', brand: 'ABIS (IB Group)', category: 'Starter Pellets', pelletSize: '2mm', weight: 25, price: 2400, purchasePrice: 1900, stock: 3, lowStockThreshold: 15, imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2022/4/PX/LM/QW/50099555/abis-fish-feed-500x500.jpg' },
    ];

    const products = await Product.insertMany(productsData.map((p) => ({ ...p, company: companyId })));

    // Create Inventory entries for both warehouses
    for (const p of products) {
      await Inventory.create({
        product: p._id,
        warehouse: warehouse1._id,
        quantity: p.stock,
        company: companyId,
      });
      await Inventory.create({
        product: p._id,
        warehouse: warehouse2._id,
        quantity: 0,
        company: companyId,
      });
    }

    // Create Customers
    const customersData = [
      { name: 'Ravi Kumar Fisheries', phone: '9812345678', email: 'ravi@ravifisheries.com', city: 'Vijayawada', type: 'Wholesale', creditLimit: 100000, outstandingBalance: 21300 },
      { name: 'Meena Fisheries', phone: '9823456789', email: 'meena@meenafisheries.com', city: 'Guntur', type: 'Retail', creditLimit: 50000, outstandingBalance: 8750 },
      { name: 'Ganesh Aqua', phone: '9845678901', city: 'Tenali', type: 'Farm', creditLimit: 75000, outstandingBalance: 5600 },
      { name: 'Padma Fish Farm', phone: '9856789012', city: 'Eluru', type: 'Farm', creditLimit: 60000, outstandingBalance: 0 },
    ];

    const customers = await Customer.insertMany(customersData.map((c) => ({ ...c, company: companyId })));

    // Create historical Invoices (using relative months based on current time)
    const company = await Company.findById(companyId);
    const companyShort = companyId.toString().slice(-4).toUpperCase();
    const prefix = company?.invoicePrefix || 'INV';

    const now = new Date();
    const invoices = [];
    const monthlyTargets = [45000, 52000, 61000, 78000, 93000, 85000]; // 6 months of data

    let invCounter = 1;
    for (let i = 5; i >= 0; i--) {
      const monthOffset = i;
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      const targetAmount = monthlyTargets[5 - i];
      let accumulated = 0;

      while (accumulated < targetAmount) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 8) + 2;
        const lineTotal = qty * product.price;
        const subtotal = lineTotal;
        const gstAmount = Math.round(subtotal * 0.05);
        const total = subtotal + gstAmount;
        const paymentType = Math.random() > 0.4 ? 'Cash' : 'Credit';
        const status = paymentType === 'Credit' ? 'Credit' : 'Paid';

        // Add a random offset for the day
        const dayOffset = Math.floor(Math.random() * 25) + 1;
        const invDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), dayOffset);

        invoices.push({
          invoiceNumber: `${prefix}-${companyShort}-${String(invCounter++).padStart(4, '0')}`,
          customer: customer._id,
          customerName: customer.name,
          items: [
            { product: product._id, productName: product.name, quantity: qty, unitPrice: product.price, lineTotal },
          ],
          subtotal,
          gstRate: 5,
          gstAmount,
          total,
          paidAmount: status === 'Paid' ? total : 0,
          paymentType,
          status,
          company: companyId,
          createdBy: userId,
          createdAt: invDate,
          updatedAt: invDate,
        });

        accumulated += total;
      }
    }

    await Invoice.insertMany(invoices);

    // Create Expenses
    const expenseCategories = ['Transport', 'Staff Salary', 'Packaging', 'Rent', 'Electricity'];
    const expensesData = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 15);
      for (const cat of expenseCategories) {
        const baseAmounts = { Transport: 5000, 'Staff Salary': 15000, Packaging: 3000, Rent: 10000, Electricity: 4000 };
        const amount = Math.round((baseAmounts[cat] || 4000) * (0.9 + Math.random() * 0.2));
        const dayOffset = Math.floor(Math.random() * 25) + 1;
        const expDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), dayOffset);

        expensesData.push({
          category: cat,
          amount,
          description: `${cat} overhead`,
          date: expDate,
          paymentMethod: 'UPI',
          status: 'Approved',
          submittedBy: userId,
          approvedBy: userId,
          company: companyId,
        });
      }
    }

    await Expense.insertMany(expensesData);

    res.json({ success: true, message: 'Demo data loaded successfully!' });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/clear-data
const clearCompanyData = async (req, res, next) => {
  try {
    const { password } = req.body;
    const companyId = req.companyId;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to clear workspace data.' });
    }

    // Load user with password field to verify
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User verification failed.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Clear action aborted.' });
    }

    await Promise.all([
      Product.deleteMany({ company: companyId }),
      Customer.deleteMany({ company: companyId }),
      Invoice.deleteMany({ company: companyId }),
      Expense.deleteMany({ company: companyId }),
      Warehouse.deleteMany({ company: companyId }),
      Inventory.deleteMany({ company: companyId }),
      StockAdjustment.deleteMany({ company: companyId }),
    ]);

    res.json({ success: true, message: 'All workspace data cleared successfully!' });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/sync-tally
const syncTallyData = async (req, res, next) => {
  try {
    const tallySyncService = require('../services/tallySyncService');
    const result = await tallySyncService.syncTallyData(req.companyId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/companies/order
const updateCompanyOrder = async (req, res, next) => {
  try {
    const { updates } = req.body; // expected: [{ _id, sortOrder }, ...]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'Updates must be an array.' });
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update._id },
        update: { sortOrder: update.sortOrder }
      }
    }));

    if (bulkOps.length > 0) {
      await Company.bulkWrite(bulkOps);
    }
    
    res.json({ success: true, message: 'Company order updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  getCompany, 
  updateCompany, 
  getUsers, 
  createUser, 
  updateUser, 
  updateProfile, 
  loadDemoData, 
  clearCompanyData,
  syncTallyData,
  updateCompanyOrder
};
