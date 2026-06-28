const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const PurchaseOrder = require('../models/PurchaseOrder');

async function checkMergedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const ownerUser = await User.findOne({ email: 'owner@vijayadurga.com' });
    if (!ownerUser || !ownerUser.company) {
      console.log('Owner user or owner company not found. No merged data issue expected.');
      process.exit(0);
    }

    const companyId = ownerUser.company;
    const company = await Company.findById(companyId);
    
    console.log(`\n--- MIGRATION CHECK ---`);
    console.log(`Target Company: ${company.name} (${companyId})`);

    const invoices = await Invoice.countDocuments({ company: companyId });
    const products = await Product.countDocuments({ company: companyId });
    const customers = await Customer.countDocuments({ company: companyId });
    const suppliers = await Supplier.countDocuments({ company: companyId });
    const warehouses = await Warehouse.countDocuments({ company: companyId });
    const purchaseOrders = await PurchaseOrder.countDocuments({ company: companyId });

    console.log(`\nFound the following records attached to this single company:`);
    console.log(`- Invoices: ${invoices}`);
    console.log(`- Products: ${products}`);
    console.log(`- Customers: ${customers}`);
    console.log(`- Suppliers: ${suppliers}`);
    console.log(`- Purchase Orders: ${purchaseOrders}`);
    console.log(`- Warehouses: ${warehouses}`);

    console.log(`\nIf you have multiple Tally companies synced in the past, these records may belong to different Tally companies but are currently collapsed into '${company.name}'.`);
    console.log(`With the new fix, future syncs will create separate companies. You may need to clear these records and re-sync to correctly separate them.`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkMergedData();
