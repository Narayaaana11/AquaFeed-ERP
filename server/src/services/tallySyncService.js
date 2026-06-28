const mongoose = require('mongoose');
const Company = require('../models/Company');
const Warehouse = require('../models/Warehouse');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const User = require('../models/User');
const CreditNote = require('../models/CreditNote');
const Quotation = require('../models/Quotation');

let isSyncRunning = false;
let syncIntervalId = null;

/**
 * Dynamically establishes connection to Tally SQL Database
 */
async function getDbConnection() {
  const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();
  const host = process.env.SQL_TALLY_DB_HOST || 'localhost';
  const port = parseInt(process.env.SQL_TALLY_DB_PORT) || (dbTech === 'mssql' ? 1433 : dbTech === 'postgres' ? 5432 : 3306);
  const database = process.env.SQL_TALLY_DB_NAME || 'tallydb';
  const user = process.env.SQL_TALLY_DB_USER || 'sa';
  const password = process.env.SQL_TALLY_DB_PASSWORD || 'admin';
  const ssl = process.env.SQL_TALLY_DB_SSL === 'true';

  console.log(`🔌 Connecting to Tally database (${dbTech}) at ${host}:${port}/${database}...`);

  if (dbTech === 'mongodb') {
    const { MongoClient } = require('mongodb');
    let mongoUri = host;
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      let auth = '';
      if (user && password) {
        auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`;
      }
      let portStr = port ? `:${port}` : '';
      mongoUri = `mongodb://${auth}${host}${portStr}`;
    }
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(database);
    db.client = client;
    return db;
  } else if (dbTech === 'mssql') {
    const sql = require('mssql');
    const config = {
      user,
      password,
      server: host,
      database,
      port,
      options: {
        encrypt: ssl,
        trustServerCertificate: true // Usually true for local databases
      }
    };
    return await sql.connect(config);
  } else if (dbTech === 'postgres' || dbTech === 'pg') {
    const { Client } = require('pg');
    const client = new Client({
      host,
      port,
      database,
      user,
      password,
      ssl: ssl ? { rejectUnauthorized: false } : false
    });
    await client.connect();
    return client;
  } else if (dbTech === 'mysql' || dbTech === 'mysql2') {
    const mysql = require('mysql2/promise');
    return await mysql.createConnection({
      host,
      port,
      database,
      user,
      password,
      ssl: ssl ? { rejectUnauthorized: false } : false
    });
  } else {
    throw new Error(`Unsupported database technology: ${dbTech}`);
  }
}

/**
 * Closes the SQL database connection
 */
async function closeDbConnection(connection) {
  if (!connection) return;
  const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();
  try {
    if (dbTech === 'mongodb') {
      if (connection.client) {
        await connection.client.close();
      }
    } else if (dbTech === 'mssql') {
      const sql = require('mssql');
      await sql.close();
    } else {
      await connection.end();
    }
    console.log(`🔌 Closed Tally ${dbTech} database connection.`);
  } catch (err) {
    console.error(`Error closing Tally ${dbTech} connection:`, err.message);
  }
}

/**
 * Executes a SQL query translating standard '?' placeholders based on driver type
 */
async function executeQuery(connection, queryStr, params = []) {
  const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();

  if (dbTech === 'mongodb') {
    const normalized = queryStr.replace(/\s+/g, ' ').trim();
    
    // 1. Warehouse/Godown query
    if (normalized.startsWith('SELECT guid, name, parent, address FROM mst_godown')) {
      return await connection.collection('mst_godown').find({}, { projection: { guid: 1, name: 1, parent: 1, address: 1 } }).toArray();
    }
    
    // 2. Customers (Sundry Debtors) query
    if (normalized.includes('Sundry Debtors')) {
      return await connection.collection('mst_ledger').aggregate([
        {
          $lookup: {
            from: 'mst_group',
            localField: 'parent',
            foreignField: 'name',
            as: 'group'
          }
        },
        {
          $unwind: { path: '$group', preserveNullAndEmptyArrays: true }
        },
        {
          $match: {
            $or: [
              { parent: 'Sundry Debtors' },
              { 'group.primary_group': 'Sundry Debtors' },
              { 'group.parent': 'Sundry Debtors' }
            ]
          }
        }
      ]).toArray();
    }
    
    // 3. Suppliers (Sundry Creditors) query
    if (normalized.includes('Sundry Creditors')) {
      return await connection.collection('mst_ledger').aggregate([
        {
          $lookup: {
            from: 'mst_group',
            localField: 'parent',
            foreignField: 'name',
            as: 'group'
          }
        },
        {
          $unwind: { path: '$group', preserveNullAndEmptyArrays: true }
        },
        {
          $match: {
            $or: [
              { parent: 'Sundry Creditors' },
              { 'group.primary_group': 'Sundry Creditors' },
              { 'group.parent': 'Sundry Creditors' }
            ]
          }
        }
      ]).toArray();
    }
    
    // 4. Products (Stock Items) query
    if (normalized.startsWith('SELECT guid, name, parent, category, alias, description, notes, part_number, uom, closing_balance, closing_rate FROM mst_stock_item')) {
      return await connection.collection('mst_stock_item').find({}).toArray();
    }
    
    // 5. Sales Order Vouchers query (must be before Sales)
    if (normalized.includes('Sales Order')) {
      let soVchTypes = await connection.collection('mst_vouchertype').find({ parent: 'Sales Order' }).toArray();
      let soVchNames = soVchTypes.map(vt => vt.name);
      soVchNames.push('Sales Order');
      return await connection.collection('trn_voucher').find({
        voucher_type: { $in: soVchNames }
      }).toArray();
    }

    // 6. Sales Vouchers query
    if (normalized.includes('Sales')) {
      let salesVchTypes = await connection.collection('mst_vouchertype').find({ parent: 'Sales' }).toArray();
      let salesVchNames = salesVchTypes.map(vt => vt.name);
      salesVchNames.push('Sales');
      return await connection.collection('trn_voucher').find({
        voucher_type: { $in: salesVchNames }
      }).toArray();
    }
    
    // 7. Purchase Order Vouchers query (must be before Purchase)
    if (normalized.includes('Purchase Order')) {
      let poVchTypes = await connection.collection('mst_vouchertype').find({ parent: 'Purchase Order' }).toArray();
      let poVchNames = poVchTypes.map(vt => vt.name);
      poVchNames.push('Purchase Order');
      return await connection.collection('trn_voucher').find({
        voucher_type: { $in: poVchNames }
      }).toArray();
    }

    // 8. Purchase Vouchers (Bills) query
    if (normalized.includes('Purchase')) {
      let purchaseVchTypes = await connection.collection('mst_vouchertype').find({ parent: 'Purchase' }).toArray();
      let purchaseVchNames = purchaseVchTypes.map(vt => vt.name);
      purchaseVchNames.push('Purchase');
      return await connection.collection('trn_voucher').find({
        voucher_type: { $in: purchaseVchNames }
      }).toArray();
    }

    // 9. Receipt Vouchers query
    if (normalized.includes('Receipt')) {
      let receiptVchTypes = await connection.collection('mst_vouchertype').find({ parent: 'Receipt' }).toArray();
      let receiptVchNames = receiptVchTypes.map(vt => vt.name);
      receiptVchNames.push('Receipt');
      return await connection.collection('trn_voucher').find({
        voucher_type: { $in: receiptVchNames }
      }).toArray();
    }

    // 10. Credit Note Vouchers query
    if (normalized.includes('Credit Note')) {
      let cnVchTypes = await connection.collection('mst_vouchertype').find({ parent: 'Credit Note' }).toArray();
      let cnVchNames = cnVchTypes.map(vt => vt.name);
      cnVchNames.push('Credit Note');
      return await connection.collection('trn_voucher').find({
        voucher_type: { $in: cnVchNames }
      }).toArray();
    }
    
    // 7. Inventory rows query
    if (normalized.startsWith('SELECT item, quantity, rate, amount, discount_amount, godown FROM trn_inventory WHERE guid = ?') ||
        normalized.startsWith('SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?')) {
      return await connection.collection('trn_inventory').find({ guid: params[0] }).toArray();
    }
    
    // 8. Accounting rows query
    if (normalized.startsWith('SELECT ledger, amount FROM trn_accounting WHERE guid = ?')) {
      return await connection.collection('trn_accounting').find({ guid: params[0] }).toArray();
    }
    
    // 9. Config query
    if (normalized.includes('FROM config')) {
      return await connection.collection('config').find({}).toArray();
    }
    
    return [];
  }

  if (dbTech === 'mssql') {
    let request = connection.request();
    let mssqlQuery = queryStr;
    params.forEach((param, index) => {
      const paramName = `p${index}`;
      // Replace only the first occurrence of ?
      mssqlQuery = mssqlQuery.replace('?', `@${paramName}`);
      request.input(paramName, param);
    });
    const result = await request.query(mssqlQuery);
    return result.recordset;
  } else if (dbTech === 'postgres' || dbTech === 'pg') {
    let pgQuery = queryStr;
    let count = 1;
    while (pgQuery.includes('?')) {
      pgQuery = pgQuery.replace('?', `$${count}`);
      count++;
    }
    const result = await connection.query(pgQuery, params);
    return result.rows;
  } else { // mysql
    const [rows] = await connection.query(queryStr, params);
    return rows;
  }
}

/**
 * Ensures that the legacy tallyGuid_1 unique index is dropped
 * so that compound unique indexes { company: 1, tallyGuid: 1 } can be created
 */
async function ensureCompoundIndexes() {
  const models = [Warehouse, Customer, Supplier, Product, Invoice, PurchaseOrder];
  for (const model of models) {
    try {
      await model.collection.dropIndex('tallyGuid_1');
      console.log(`🗑️ Dropped legacy unique index tallyGuid_1 from ${model.modelName} collection.`);
    } catch (err) {
      // index might not exist or already dropped, ignore
    }
  }
}

/**
 * Synchronizes data from Tally SQL Database to MongoDB
 */
async function syncTallyData(targetCompanyId = null) {
  if (isSyncRunning) {
    console.log('⏳ Tally sync is already running. Skipping.');
    return { success: false, message: 'Sync already in progress' };
  }

  isSyncRunning = true;
  
  // Clean up legacy indexes before proceeding
  await ensureCompoundIndexes();

  let connection = null;
  const stats = {
    warehouses: 0,
    customers: 0,
    suppliers: 0,
    products: 0,
    invoices: 0,
    purchaseOrders: 0,
    receiptsApplied: 0,
    purchaseBills: 0,
    creditNotes: 0,
    quotations: 0,
    startTime: new Date()
  };

  let baseConnection = null;
  try {
    // 1. Establish base connection to Tally staging server
    baseConnection = await getDbConnection();
    const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();

    // 2. Discover all staging databases (for MongoDB)
    let stagingDbs = [];
    if (dbTech === 'mongodb') {
      try {
        const adminDb = baseConnection.client.db('admin');
        const dbList = await adminDb.admin().listDatabases();
        
        stagingDbs = dbList.databases
          .filter(d => d.name.startsWith('tallydb_'))
          .map(d => d.name);
      } catch (err) {
        console.warn('⚠️ Could not list MongoDB databases, using default schema name.', err.message);
      }
    }

    if (stagingDbs.length === 0) {
      stagingDbs = [process.env.SQL_TALLY_DB_NAME || 'tallydb'];
    }

    console.log(`🔍 Found staging databases to sync: ${stagingDbs.join(', ')}`);

    for (const dbName of stagingDbs) {
      console.log(`\n🏢 Starting sync from staging database: "${dbName}"`);
      
      let dbConn;
      if (dbTech === 'mongodb') {
        dbConn = baseConnection.client.db(dbName);
      } else {
        dbConn = baseConnection;
      }
      connection = dbConn;

      // 3. Resolve Company
      let companyName = process.env.TALLY_COMPANY || 'VIJAYA DURGA AQUA FEEDS & NEEDS';
      try {
        const configRows = await executeQuery(connection, "SELECT name, value FROM config");
        const companyConfig = configRows.find(r => r.name === 'Company Name');
        if (companyConfig && companyConfig.value) {
          companyName = companyConfig.value;
          console.log(`🏢 Dynamically resolved company name from staging DB "${dbName}": "${companyName}"`);
        }
      } catch (configErr) {
        console.warn(`⚠️ Could not query config table from staging DB "${dbName}":`, configErr.message);
      }

      let company;
      if (targetCompanyId) {
        company = await Company.findById(targetCompanyId);
      } else {
        // Find existing company by exact name match (case-insensitive)
        company = await Company.findOne({ name: { $regex: new RegExp('^' + companyName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } });
        
        if (!company) {
          // Last resort: create a new company profile
          company = await Company.create({
            name: companyName,
            ownerName: 'Tally Admin',
            phone: '',
            email: '',
            address: 'Tally Integrated Company',
            city: '',
            state: '',
            currency: 'INR'
          });
          console.log(`🏢 Created new Company: ${companyName}`);
        }
      }
      const companyId = company._id;

    // 3. Sync Warehouses (Tally Godowns)
    console.log('🔄 Syncing Warehouses (Godowns)...');
    const godowns = await executeQuery(connection, 'SELECT guid, name, parent, address FROM mst_godown');
    for (const g of godowns) {
      const code = g.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || `WH-${g.guid.slice(0, 5).toUpperCase()}`;
      await Warehouse.findOneAndUpdate(
        { tallyGuid: g.guid, company: companyId },
        {
          $set: {
            name: g.name,
            code,
            address: g.address || '',
            status: 'Active',
            manager: 'Tally Synced',
            company: companyId
          }
        },
        { upsert: true }
      );
      stats.warehouses++;
    }

    // Get default warehouse for fallback
    const defaultWarehouse = await Warehouse.findOne({ company: companyId, isDefault: true })
      || await Warehouse.findOne({ company: companyId });

    // 4. Sync Customers (Sundry Debtors ledgers)
    console.log('🔄 Syncing Customers (Sundry Debtors)...');
    const customers = await executeQuery(
      connection,
      `SELECT l.guid, l.name, l.parent, l.mailing_address, l.mailing_state, l.mobile, l.email, l.gstn, l.closing_balance 
       FROM mst_ledger l
       LEFT JOIN mst_group g ON l.parent = g.name
       WHERE l.parent = 'Sundry Debtors' OR g.primary_group = 'Sundry Debtors' OR g.parent = 'Sundry Debtors'`
    );
    for (const c of customers) {
      await Customer.findOneAndUpdate(
        { tallyGuid: c.guid, company: companyId },
        {
          $set: {
            name: c.name,
            phone: c.mobile || '',
            email: c.email || '',
            address: c.mailing_address || '',
            state: c.mailing_state || '',
            gstNumber: c.gstn ? c.gstn.toUpperCase() : '',
            outstandingBalance: Math.abs(parseFloat(c.closing_balance) || 0),
            type: 'Wholesale',
            isActive: true,
            notes: `Synced from Tally group: ${c.parent}`,
            company: companyId
          }
        },
        { upsert: true }
      );
      stats.customers++;
    }

    // 5. Sync Suppliers (Sundry Creditors ledgers)
    console.log('🔄 Syncing Suppliers (Sundry Creditors)...');
    const suppliers = await executeQuery(
      connection,
      `SELECT l.guid, l.name, l.parent, l.mailing_address, l.mailing_state, l.mobile, l.email, l.gstn, l.closing_balance 
       FROM mst_ledger l
       LEFT JOIN mst_group g ON l.parent = g.name
       WHERE l.parent = 'Sundry Creditors' OR g.primary_group = 'Sundry Creditors' OR g.parent = 'Sundry Creditors'`
    );
    for (const s of suppliers) {
      await Supplier.findOneAndUpdate(
        { tallyGuid: s.guid, company: companyId },
        {
          $set: {
            name: s.name,
            contactPerson: 'Tally Contact',
            phone: s.mobile || '',
            email: s.email || '',
            address: s.mailing_address || '',
            state: s.mailing_state || '',
            gstNumber: s.gstn ? s.gstn.toUpperCase() : '',
            paymentTerms: 'Net30',
            outstandingBalance: Math.abs(parseFloat(s.closing_balance) || 0),
            notes: `Synced from Tally group: ${s.parent}`,
            isActive: true,
            company: companyId
          }
        },
        { upsert: true }
      );
      stats.suppliers++;
    }

    // 6. Sync Products (Stock Items)
    console.log('🔄 Syncing Products (Stock Items)...');
    const stockItems = await executeQuery(
      connection,
      'SELECT guid, name, parent, category, alias, description, notes, part_number, uom, closing_balance, closing_rate FROM mst_stock_item'
    );
    for (const p of stockItems) {
      const closingRate = Math.abs(parseFloat(p.closing_rate) || 0);
      const stockVal = parseFloat(p.closing_balance) || 0;

      const productDoc = await Product.findOneAndUpdate(
        { tallyGuid: p.guid, company: companyId },
        {
          $set: {
            name: p.name,
            sku: p.part_number || p.alias || p.guid.slice(0, 8).toUpperCase(),
            brand: p.parent || 'Tally',
            category: p.category || 'Other',
            unit: p.uom || 'kg',
            price: closingRate || 0,
            stock: stockVal,
            description: p.description || p.notes || '',
            isActive: true,
            company: companyId
          }
        },
        { upsert: true, new: true }
      );

      // Create/Update Inventory entries
      if (defaultWarehouse) {
        await Inventory.findOneAndUpdate(
          { product: productDoc._id, warehouse: defaultWarehouse._id, company: companyId },
          { $set: { quantity: stockVal } },
          { upsert: true }
        );
      }
      stats.products++;
    }

    // 7. Sync Sales Invoices (Vouchers mapping to base type 'Sales')
    console.log('🔄 Syncing Sales Invoices...');
    const salesVouchers = await executeQuery(
      connection,
      `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name, place_of_supply 
       FROM trn_voucher 
       WHERE voucher_type = 'Sales' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Sales')`
    );

    for (const v of salesVouchers) {
      // Find customer
      let dbCustomer = await Customer.findOne({ name: v.party_name, company: companyId });
      if (!dbCustomer) {
        dbCustomer = await Customer.create({
          name: v.party_name,
          isActive: true,
          company: companyId
        });
      }

      // Fetch items for this sales invoice
      const invItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount, godown FROM trn_inventory WHERE guid = ?', [v.guid]);
      const items = [];
      let subtotal = 0;

      for (const itemRow of invItemsRows) {
        let dbProduct = await Product.findOne({ name: itemRow.item, company: companyId });
        if (!dbProduct) {
          dbProduct = await Product.create({
            name: itemRow.item,
            brand: 'Tally',
            price: Math.abs(parseFloat(itemRow.rate) || 0),
            weight: 1,
            company: companyId
          });
        }

        let lineWarehouse = defaultWarehouse;
        if (itemRow.godown) {
          const dbWarehouse = await Warehouse.findOne({ name: itemRow.godown, company: companyId });
          if (dbWarehouse) lineWarehouse = dbWarehouse;
        }

        const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
        const unitPrice = Math.abs(parseFloat(itemRow.rate) || 0);
        const discountVal = Math.abs(parseFloat(itemRow.discount_amount) || 0);
        const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);

        subtotal += lineTotal;

        items.push({
          product: dbProduct._id,
          productName: dbProduct.name,
          quantity: qty,
          unitPrice,
          discount: discountVal > 0 ? Math.round((discountVal / (qty * unitPrice)) * 100) : 0,
          lineTotal
        });
      }

      // Fetch accounting records for totals & GST
      const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
      let totalAmount = 0;
      let gstAmount = 0;
      let hasBankOrCash = false;

      for (const acc of accRows) {
        const accAmount = Math.abs(parseFloat(acc.amount) || 0);
        if (acc.ledger === v.party_name) {
          totalAmount = accAmount;
        }
        
        const ledgerUpper = acc.ledger.toUpperCase();
        if (ledgerUpper.includes('CGST') || ledgerUpper.includes('SGST') || ledgerUpper.includes('IGST') || ledgerUpper.includes('GST')) {
          gstAmount += accAmount;
        }

        if (ledgerUpper.includes('CASH') || ledgerUpper.includes('BANK') || ledgerUpper.includes('SBI') || ledgerUpper.includes('HDFC') || ledgerUpper.includes('ICICI')) {
          hasBankOrCash = true;
        }
      }

      if (totalAmount === 0) {
        // Fallback total if party ledger wasn't matched in trn_accounting
        totalAmount = subtotal + gstAmount;
      }

      const gstRate = subtotal > 0 ? Math.round((gstAmount / subtotal) * 100) : 5;
      const status = hasBankOrCash ? 'Paid' : 'Credit';
      const paymentType = hasBankOrCash ? 'Cash' : 'Credit';
      const paidAmount = hasBankOrCash ? totalAmount : 0;

      await Invoice.findOneAndUpdate(
        { tallyGuid: v.guid, company: companyId },
        {
          $set: {
            invoiceNumber: v.voucher_number || `TI-${v.guid.slice(0, 8).toUpperCase()}`,
            customer: dbCustomer._id,
            customerName: dbCustomer.name,
            items,
            subtotal,
            gstRate,
            gstAmount,
            total: totalAmount,
            paidAmount,
            paymentType,
            status,
            dueDate: new Date(v.date),
            notes: v.narration || '',
            warehouse: defaultWarehouse ? defaultWarehouse._id : null,
            company: companyId
          }
        },
        { upsert: true }
      );
      stats.invoices++;
    }

    // 8. Sync Purchase Orders
    console.log('🔄 Syncing Purchase Orders...');
    const poVouchers = await executeQuery(
      connection,
      `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
       FROM trn_voucher 
       WHERE voucher_type = 'Purchase Order' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Purchase Order')`
    );

    for (const v of poVouchers) {
      let dbSupplier = await Supplier.findOne({ name: v.party_name, company: companyId });
      if (!dbSupplier) {
        dbSupplier = await Supplier.create({
          name: v.party_name,
          isActive: true,
          company: companyId
        });
      }

      const poItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
      const items = [];
      let subtotal = 0;

      for (const itemRow of poItemsRows) {
        let dbProduct = await Product.findOne({ name: itemRow.item, company: companyId });
        if (!dbProduct) {
          dbProduct = await Product.create({
            name: itemRow.item,
            brand: 'Tally',
            price: Math.abs(parseFloat(itemRow.rate) || 0),
            weight: 1,
            company: companyId
          });
        }

        const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
        const unitCost = Math.abs(parseFloat(itemRow.rate) || 0);
        const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
        subtotal += lineTotal;

        items.push({
          product: dbProduct._id,
          productName: dbProduct.name,
          quantity: qty,
          unitCost,
          lineTotal
        });
      }

      await PurchaseOrder.findOneAndUpdate(
        { tallyGuid: v.guid, company: companyId },
        {
          $set: {
            poNumber: v.voucher_number || `TPO-${v.guid.slice(0, 8).toUpperCase()}`,
            supplier: dbSupplier._id,
            supplierName: dbSupplier.name,
            items,
            subtotal,
            totalAmount: subtotal,
            status: 'Ordered',
            expectedDate: new Date(v.date),
            notes: v.narration || '',
            warehouse: defaultWarehouse ? defaultWarehouse._id : null,
            company: companyId
          }
        },
        { upsert: true }
      );
      stats.purchaseOrders++;
    }

    // 9. Sync Receipt Vouchers
    console.log('🔄 Syncing Receipt Vouchers...');
    const receiptVouchers = await executeQuery(
      connection,
      `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
       FROM trn_voucher 
       WHERE voucher_type = 'Receipt' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Receipt')`
    );

    for (const v of receiptVouchers) {
      try {
        const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
        let amountReceived = 0;
        let paymentType = 'Bank Transfer'; // Default
        let partyName = v.party_name;

        for (const acc of accRows) {
          const accAmount = Math.abs(parseFloat(acc.amount) || 0);
          const ledgerUpper = acc.ledger.toUpperCase();
          if (acc.ledger === partyName) {
            amountReceived = accAmount;
          }
          if (ledgerUpper.includes('CASH')) paymentType = 'Cash';
          else if (ledgerUpper.includes('BANK') || ledgerUpper.includes('SBI') || ledgerUpper.includes('HDFC') || ledgerUpper.includes('ICICI')) paymentType = 'Bank Transfer';
          else if (ledgerUpper.includes('UPI')) paymentType = 'UPI';
        }

        if (amountReceived <= 0 || !partyName) {
          console.log(`⚠️ Receipt voucher ${v.guid} — amount is 0 or no party name, skipped`);
          continue;
        }

        const dbCustomer = await Customer.findOne({ name: partyName, company: companyId });
        if (!dbCustomer) {
          console.log(`⚠️ Receipt voucher ${v.guid} for "${partyName}" — no matching customer found, skipped`);
          continue;
        }

        let remainingToApply = amountReceived;
        const pendingInvoices = await Invoice.find({
          customer: dbCustomer._id,
          company: companyId,
          status: { $in: ['Credit', 'Overdue', 'Pending'] }
        }).sort({ dueDate: 1 });

        if (pendingInvoices.length === 0) {
          console.log(`⚠️ Receipt voucher ${v.guid} for "${partyName}" — no unpaid invoice found, skipped`);
          continue;
        }

        for (const inv of pendingInvoices) {
          if (remainingToApply <= 0) break;
          
          // Check if already applied
          if (inv.payments && inv.payments.some(p => p.tallyReceiptGuid === v.guid)) {
            console.log(`⚠️ Receipt voucher ${v.guid} already applied to invoice ${inv.invoiceNumber}, skipped`);
            remainingToApply = 0; // Prevent applying to other invoices if it was already applied
            break; 
          }

          const invRemainingBalance = inv.total - inv.paidAmount;
          if (invRemainingBalance <= 0) continue;

          const amountToApply = Math.min(remainingToApply, invRemainingBalance);
          inv.paidAmount += amountToApply;
          remainingToApply -= amountToApply;

          inv.payments.push({
            amount: amountToApply,
            paymentType,
            referenceNumber: v.reference_number || v.voucher_number || '',
            tallyReceiptGuid: v.guid,
            date: new Date(v.date)
          });

          if (inv.paidAmount >= inv.total) {
            inv.status = 'Paid';
            inv.paymentType = inv.payments.length > 1 ? 'Split' : paymentType;
          }

          await inv.save();
          stats.receiptsApplied++;
        }
      } catch (err) {
        console.error(`Error processing Receipt voucher ${v.guid}:`, err.message);
      }
    }

    // 10. Sync Purchase Bills
    console.log('🔄 Syncing Purchase Bills...');
    const purchaseVouchers = await executeQuery(
      connection,
      `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
       FROM trn_voucher 
       WHERE voucher_type = 'Purchase' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Purchase')`
    );

    for (const v of purchaseVouchers) {
      try {
        let dbSupplier = await Supplier.findOne({ name: v.party_name, company: companyId });
        if (!dbSupplier) {
          dbSupplier = await Supplier.create({ name: v.party_name, isActive: true, company: companyId });
        }

        const poItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
        const items = [];
        let subtotal = 0;

        for (const itemRow of poItemsRows) {
          let dbProduct = await Product.findOne({ name: itemRow.item, company: companyId });
          if (!dbProduct) {
            dbProduct = await Product.create({ name: itemRow.item, brand: 'Tally', price: Math.abs(parseFloat(itemRow.rate) || 0), weight: 1, company: companyId });
          }
          const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
          const unitCost = Math.abs(parseFloat(itemRow.rate) || 0);
          const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
          subtotal += lineTotal;
          items.push({ product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitCost, lineTotal });
        }

        let existingPO = null;
        if (v.reference_number) {
          existingPO = await PurchaseOrder.findOne({ poNumber: v.reference_number, company: companyId });
        }
        if (!existingPO) {
          existingPO = await PurchaseOrder.findOne({ 
            supplier: dbSupplier._id, 
            totalAmount: subtotal, 
            company: companyId,
            status: { $nin: ['Received', 'Cancelled'] } 
          });
        }

        if (existingPO) {
          existingPO.status = 'Received';
          existingPO.tallyGuid = v.guid;
          existingPO.receivedDate = new Date(v.date);
          await existingPO.save();
        } else {
          await PurchaseOrder.findOneAndUpdate(
            { tallyGuid: v.guid, company: companyId },
            {
              $set: {
                poNumber: v.voucher_number || `PB-${v.guid.slice(0, 8).toUpperCase()}`,
                supplier: dbSupplier._id,
                supplierName: dbSupplier.name,
                items,
                subtotal,
                totalAmount: subtotal,
                status: 'Received',
                expectedDate: new Date(v.date),
                receivedDate: new Date(v.date),
                notes: v.narration || '',
                warehouse: defaultWarehouse ? defaultWarehouse._id : null,
                company: companyId
              }
            },
            { upsert: true }
          );
        }
        stats.purchaseBills++;
      } catch (err) {
        console.error(`Error processing Purchase Bill voucher ${v.guid}:`, err.message);
      }
    }

    // 11. Sync Credit Note Vouchers
    console.log('🔄 Syncing Credit Notes...');
    const cnVouchers = await executeQuery(
      connection,
      `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
       FROM trn_voucher 
       WHERE voucher_type = 'Credit Note' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Credit Note')`
    );

    for (const v of cnVouchers) {
      try {
        const dbCustomer = await Customer.findOne({ name: v.party_name, company: companyId });
        if (!dbCustomer) continue;

        const cnItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
        const items = [];
        let subtotal = 0;

        for (const itemRow of cnItemsRows) {
          let dbProduct = await Product.findOne({ name: itemRow.item, company: companyId });
          if (!dbProduct) continue;
          const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
          const unitPrice = Math.abs(parseFloat(itemRow.rate) || 0);
          const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
          subtotal += lineTotal;
          items.push({ product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitPrice, lineTotal });
        }

        const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
        let totalAmount = subtotal;
        for (const acc of accRows) {
          if (acc.ledger === v.party_name) {
            totalAmount = Math.abs(parseFloat(acc.amount) || 0);
          }
        }

        let origInvoice = null;
        if (v.reference_number) {
          origInvoice = await Invoice.findOne({ invoiceNumber: v.reference_number, company: companyId });
        }
        if (!origInvoice) {
          origInvoice = await Invoice.findOne({ customer: dbCustomer._id, company: companyId }).sort({ createdAt: -1 });
        }

        if (origInvoice) {
          await CreditNote.findOneAndUpdate(
            { tallyGuid: v.guid, company: companyId },
            {
              $set: {
                creditNoteNumber: v.voucher_number || `CN-${v.guid.slice(0, 8).toUpperCase()}`,
                originalInvoice: origInvoice._id,
                originalInvoiceNumber: origInvoice.invoiceNumber,
                customer: dbCustomer._id,
                customerName: dbCustomer.name,
                items,
                reason: v.narration || 'Synced from Tally',
                totalAmount,
                status: 'Issued',
                warehouse: defaultWarehouse ? defaultWarehouse._id : null,
                company: companyId
              }
            },
            { upsert: true }
          );
          stats.creditNotes++;
        } else {
          console.log(`⚠️ Credit Note voucher ${v.guid} for "${v.party_name}" — no original invoice found, skipped`);
        }
      } catch (err) {
        console.error(`Error processing Credit Note voucher ${v.guid}:`, err.message);
      }
    }

    // 12. Sync Sales Order Vouchers -> Quotations
    console.log('🔄 Syncing Sales Orders...');
    const soVouchers = await executeQuery(
      connection,
      `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
       FROM trn_voucher 
       WHERE voucher_type = 'Sales Order' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Sales Order')`
    );

    for (const v of soVouchers) {
      try {
        let dbCustomer = await Customer.findOne({ name: v.party_name, company: companyId });
        if (!dbCustomer) {
          dbCustomer = await Customer.create({ name: v.party_name, isActive: true, company: companyId });
        }

        const soItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
        const items = [];
        let subtotal = 0;

        for (const itemRow of soItemsRows) {
          let dbProduct = await Product.findOne({ name: itemRow.item, company: companyId });
          if (!dbProduct) {
            dbProduct = await Product.create({ name: itemRow.item, brand: 'Tally', price: Math.abs(parseFloat(itemRow.rate) || 0), weight: 1, company: companyId });
          }
          const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
          const unitPrice = Math.abs(parseFloat(itemRow.rate) || 0);
          const discountVal = Math.abs(parseFloat(itemRow.discount_amount) || 0);
          const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
          subtotal += lineTotal;
          items.push({ 
            product: dbProduct._id, 
            productName: dbProduct.name, 
            quantity: qty, 
            unitPrice, 
            discount: discountVal > 0 ? Math.round((discountVal / (qty * unitPrice)) * 100) : 0,
            lineTotal 
          });
        }

        const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
        let totalAmount = subtotal;
        let gstAmount = 0;
        for (const acc of accRows) {
          const accAmount = Math.abs(parseFloat(acc.amount) || 0);
          if (acc.ledger === v.party_name) {
            totalAmount = accAmount;
          }
          const ledgerUpper = acc.ledger.toUpperCase();
          if (ledgerUpper.includes('CGST') || ledgerUpper.includes('SGST') || ledgerUpper.includes('IGST') || ledgerUpper.includes('GST')) {
            gstAmount += accAmount;
          }
        }
        
        if (totalAmount === 0 || totalAmount === subtotal) {
          totalAmount = subtotal + gstAmount;
        }
        const gstRate = subtotal > 0 ? Math.round((gstAmount / subtotal) * 100) : 5;

        await Quotation.findOneAndUpdate(
          { tallyGuid: v.guid, company: companyId },
          {
            $set: {
              quotationNumber: v.voucher_number || `SO-${v.guid.slice(0, 8).toUpperCase()}`,
              customer: dbCustomer._id,
              customerName: dbCustomer.name,
              items,
              subtotal,
              gstRate,
              gstAmount,
              total: totalAmount,
              status: 'Sent',
              validUntil: new Date(new Date(v.date).getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
              notes: v.narration || '',
              company: companyId
            }
          },
          { upsert: true }
        );
        stats.quotations++;
      } catch (err) {
        console.error(`Error processing Sales Order voucher ${v.guid}:`, err.message);
      }
    }
    } // End of stagingDbs loop

    const duration = ((new Date() - stats.startTime) / 1000).toFixed(1);
    console.log(`✅ Tally sync completed in ${duration}s! Sync stats:`, stats);

    // Emit event to all connected clients that sync is complete
    const app = require('../index'); // Need to get app to access app.locals.io
    if (app && app.locals && app.locals.io) {
       app.locals.io.emit('TALLY_SYNC_COMPLETED', { stats, timestamp: new Date() });
    }

    return {
      success: true,
      message: `Successfully synchronized Tally database.`,
      stats
    };

  } catch (err) {
    console.error('❌ Tally sync error:', err);
    return {
      success: false,
      message: err.message,
      error: err
    };
  } finally {
    isSyncRunning = false;
    await closeDbConnection(baseConnection || connection);
  }
}

/**
 * Initializes the background scheduler
 */
function startSyncScheduler() {
  if (syncIntervalId) {
    console.log('Tally Sync scheduler is already running.');
    return;
  }

  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS) || 60000;
  console.log(`⏰ Starting Tally Sync background worker (Interval: ${pollInterval}ms)`);
  
  // Run once on startup
  setTimeout(() => {
    syncTallyData().catch(err => console.error('Error in startup Tally sync:', err));
  }, 5000);

  // Set interval
  syncIntervalId = setInterval(async () => {
    try {
      await syncTallyData();
    } catch (err) {
      console.error('Error during scheduled Tally sync:', err.message);
    }
  }, pollInterval);
}

/**
 * Stops the background scheduler
 */
function stopSyncScheduler() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('🛑 Tally Sync background worker stopped.');
  }
}

module.exports = {
  syncTallyData,
  startSyncScheduler,
  stopSyncScheduler
};
