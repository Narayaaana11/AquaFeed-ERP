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
const Expense = require('../models/Expense');
const FinancialMetric = require('../models/FinancialMetric');
const Batch = require('../models/Batch');
const SyncMetadata = require('../models/SyncMetadata'); // NEW

let isSyncRunning = false;
let syncIntervalId = null;

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
    
    // 0. Company query
    if (normalized.startsWith('SELECT guid, name, books_from, starting_from FROM mst_company')) {
      return await connection.collection('mst_company').find({}).toArray();
    }
    
    
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

    // 9.5. Ledgers and groups query for Financial Metrics
    if (normalized.includes('SELECT l.name, l.parent, g.primary_group')) {
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
          $project: {
            name: 1,
            parent: 1,
            primary_group: '$group.primary_group',
            group_parent: '$group.parent',
            closing_balance: 1
          }
        }
      ]).toArray();
    }

    // 9.6. Expense ledgers query
    if (normalized.includes("IN ('Direct Expenses', 'Indirect Expenses')")) {
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
              { parent: { $in: ['Direct Expenses', 'Indirect Expenses'] } },
              { 'group.primary_group': { $in: ['Direct Expenses', 'Indirect Expenses'] } },
              { 'group.parent': { $in: ['Direct Expenses', 'Indirect Expenses'] } }
            ]
          }
        },
        {
          $project: {
            name: 1
          }
        }
      ]).toArray();
    }
    // 10. Batches query (Opening)
    if (normalized.startsWith('SELECT name, item, opening_balance, opening_rate, opening_value, godown, manufactured_on FROM mst_opening_batch_allocation')) {
      return await connection.collection('mst_opening_batch_allocation').find({}).toArray();
    }

    // 11. Batches query (Transactions)
    if (normalized.startsWith('SELECT guid, item, name, quantity, amount, godown, destination_godown, tracking_number FROM trn_batch')) {
      return await connection.collection('trn_batch').find({}).toArray();
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
  const models = [Warehouse, Customer, Supplier, Product, Invoice, PurchaseOrder, Expense, CreditNote, Quotation];
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
 * Maps a Tally Ledger name to one of the ERP's supported Expense Categories
 */
function mapLedgerToExpenseCategory(ledgerName) {
  const name = ledgerName.toLowerCase();
  if (name.includes('salary') || name.includes('wage') || name.includes('staff') || name.includes('employee')) {
    return 'Staff Salary';
  }
  if (name.includes('transport') || name.includes('freight') || name.includes('carriage') || name.includes('delivery') || name.includes('cartage') || name.includes('loading') || name.includes('coolie')) {
    return 'Transport';
  }
  if (name.includes('packaging') || name.includes('packing') || name.includes('box') || name.includes('bag')) {
    return 'Packaging';
  }
  if (name.includes('electricity') || name.includes('power') || name.includes('light') || name.includes('eb bill')) {
    return 'Electricity';
  }
  if (name.includes('rent') || name.includes('lease') || name.includes('office rent')) {
    return 'Rent';
  }
  if (name.includes('repair') || name.includes('service') || name.includes('fixing') || name.includes('mechanic')) {
    return 'Repairs';
  }
  if (name.includes('maintenance') || name.includes('cleaning') || name.includes('upkeep') || name.includes('sanitation')) {
    return 'Maintenance';
  }
  if (name.includes('marketing') || name.includes('ad ') || name.includes('advertis') || name.includes('promotion') || name.includes('banner')) {
    return 'Marketing';
  }
  return 'Other';
}

/**
 * Synchronizes data from Tally SQL Database to MongoDB
 */

async function executeBulkWriteInBatches(model, operations, batchSize = 1000) {
  let successCount = 0;
  for (let i = 0; i < operations.length; i += batchSize) {
    const chunk = operations.slice(i, i + batchSize);
    if (chunk.length > 0) {
      try {
        const result = await model.bulkWrite(chunk, { ordered: false });
        successCount += (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.insertedCount || 0);
      } catch (err) {
        console.error(`BulkWrite error in ${model.modelName}:`, err.message);
        if (err.result) {
          successCount += (err.result.nUpserted || 0) + (err.result.nModified || 0) + (err.result.nInserted || 0);
        }
      }
    }
  }
  return successCount;
}

async function syncTallyData(targetCompanyId = null) {
  if (isSyncRunning) {
    console.log('⏳ Tally sync is already running. Skipping.');
    return { success: false, message: 'Sync already in progress' };
  }

  isSyncRunning = true;
  await ensureCompoundIndexes();

  let connection = null;
  const stats = {
    warehouses: 0,
    batches: 0,
    customers: 0,
    suppliers: 0,
    products: 0,
    invoices: 0,
    purchaseOrders: 0,
    receiptsApplied: 0,
    purchaseBills: 0,
    creditNotes: 0,
    quotations: 0,
    expenses: 0,
    startTime: new Date()
  };

  let baseConnection = null;
  try {
    baseConnection = await getDbConnection();
    const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();

    let stagingDbs = [];
    if (dbTech === 'mongodb') {
      try {
        const adminDb = baseConnection.client.db('admin');
        const dbList = await adminDb.admin().listDatabases();
        stagingDbs = dbList.databases.filter(d => d.name.startsWith('tallydb_')).map(d => d.name);
      } catch (err) {
        console.warn('⚠️ Could not list MongoDB databases, using default schema name.', err.message);
      }
    }

    if (stagingDbs.length === 0) stagingDbs = [process.env.SQL_TALLY_DB_NAME || 'tallydb'];

    console.log(`🔍 Found staging databases to sync: ${stagingDbs.join(', ')}`);

    for (const dbName of stagingDbs) {
      const dbStartTime = Date.now();
      console.log(`\n🏢 Starting sync from staging database: "${dbName}"`);
      
      let dbConn;
      if (dbTech === 'mongodb') {
        dbConn = baseConnection.client.db(dbName);
      } else {
        dbConn = baseConnection;
      }
      connection = dbConn;

      // --- Company Resolution ---
      let companyName = process.env.TALLY_COMPANY || 'VIJAYA DURGA AQUA FEEDS & NEEDS';
      let companyMetadata = null;
      try {
        const companyRows = await executeQuery(connection, "SELECT guid, name, books_from, starting_from FROM mst_company");
        if (companyRows && companyRows.length > 0) {
          companyMetadata = companyRows[0];
          companyName = companyMetadata.name || companyName;
        } else {
          const configRows = await executeQuery(connection, "SELECT name, value FROM config");
          const companyConfig = configRows.find(r => r.name === 'Company Name');
          if (companyConfig && companyConfig.value) companyName = companyConfig.value;
        }
      } catch (err) {
        console.warn(`⚠️ Could not query company metadata from staging DB "${dbName}":`, err.message);
      }

      let company;
      if (targetCompanyId) {
        company = await Company.findById(targetCompanyId);
      } else {
        let findQuery = { name: { $regex: new RegExp('^' + companyName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } };
        if (companyMetadata && companyMetadata.guid) findQuery = { $or: [{ tallyGuid: companyMetadata.guid }, findQuery] };
        
        company = await Company.findOne(findQuery);
        const companyDataToUpdate = {
          name: companyName,
          tallyGuid: companyMetadata ? companyMetadata.guid : undefined,
          booksFrom: companyMetadata ? new Date(companyMetadata.books_from) : undefined,
          startingFrom: companyMetadata ? new Date(companyMetadata.starting_from) : undefined
        };

        if (!company) {
          company = await Company.create({
            ...companyDataToUpdate, ownerName: 'Tally Admin', phone: '', email: '', address: 'Tally Integrated Company', city: '', state: '', currency: 'INR'
          });
        } else {
          company = await Company.findByIdAndUpdate(company._id, { $set: companyDataToUpdate }, { new: true });
        }
      }
      const companyId = company._id;

      // Update SyncMetadata status
      await SyncMetadata.findOneAndUpdate({ company: companyId }, { status: 'Syncing' }, { upsert: true });

      // --- Phase 1: Independent Collections (Sequential fetch, BulkWrite) ---
      
      // 1. Warehouses
      console.log('🔄 Syncing Warehouses (Godowns)...');
      let t0 = Date.now();
      const godowns = await executeQuery(connection, 'SELECT guid, name, parent, address FROM mst_godown');
      const warehouseOps = godowns.map(g => {
        const code = g.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || `WH-${g.guid.slice(0, 5).toUpperCase()}`;
        return {
          updateOne: {
            filter: { tallyGuid: g.guid, company: companyId },
            update: { $set: { name: g.name, code, address: g.address || '', status: 'Active', manager: 'Tally Synced', company: companyId } },
            upsert: true
          }
        };
      });
      stats.warehouses += await executeBulkWriteInBatches(Warehouse, warehouseOps);
      console.log(`   ⏱️ Warehouses took ${(Date.now() - t0)}ms`);

      // Pre-fetch warehouses for caching
      const dbWarehouses = await Warehouse.find({ company: companyId }).lean();
      const defaultWarehouse = dbWarehouses.find(w => w.isDefault) || dbWarehouses[0];
      const warehouseMap = new Map(dbWarehouses.map(w => [w.name, w]));

      // 2. Customers
      console.log('🔄 Syncing Customers (Sundry Debtors)...');
      t0 = Date.now();
      const customers = await executeQuery(
        connection,
        `SELECT l.guid, l.name, l.parent, l.mailing_address, l.mailing_state, l.mobile, l.email, l.gstn, l.closing_balance 
         FROM mst_ledger l
         LEFT JOIN mst_group g ON l.parent = g.name
         WHERE l.parent = 'Sundry Debtors' OR g.primary_group = 'Sundry Debtors' OR g.parent = 'Sundry Debtors'`
      );
      const customerOps = customers.map(c => ({
        updateOne: {
          filter: { tallyGuid: c.guid, company: companyId },
          update: {
            $set: {
              name: c.name, phone: c.mobile || '', email: c.email || '', address: c.mailing_address || '', state: c.mailing_state || '',
              gstNumber: c.gstn ? c.gstn.toUpperCase() : '', outstandingBalance: parseFloat(c.closing_balance) || 0,
              type: 'Wholesale', isActive: true, notes: `Synced from Tally group: ${c.parent}`, company: companyId
            }
          },
          upsert: true
        }
      }));
      stats.customers += await executeBulkWriteInBatches(Customer, customerOps);
      console.log(`   ⏱️ Customers took ${(Date.now() - t0)}ms`);

      // 3. Suppliers
      console.log('🔄 Syncing Suppliers (Sundry Creditors)...');
      t0 = Date.now();
      const suppliers = await executeQuery(
        connection,
        `SELECT l.guid, l.name, l.parent, l.mailing_address, l.mailing_state, l.mobile, l.email, l.gstn, l.closing_balance 
         FROM mst_ledger l
         LEFT JOIN mst_group g ON l.parent = g.name
         WHERE l.parent = 'Sundry Creditors' OR g.primary_group = 'Sundry Creditors' OR g.parent = 'Sundry Creditors'`
      );
      const supplierOps = suppliers.map(s => ({
        updateOne: {
          filter: { tallyGuid: s.guid, company: companyId },
          update: {
            $set: {
              name: s.name, contactPerson: 'Tally Contact', phone: s.mobile || '', email: s.email || '', address: s.mailing_address || '',
              state: s.mailing_state || '', gstNumber: s.gstn ? s.gstn.toUpperCase() : '', paymentTerms: 'Net30',
              outstandingBalance: parseFloat(s.closing_balance) || 0, notes: `Synced from Tally group: ${s.parent}`, isActive: true, company: companyId
            }
          },
          upsert: true
        }
      }));
      stats.suppliers += await executeBulkWriteInBatches(Supplier, supplierOps);
      console.log(`   ⏱️ Suppliers took ${(Date.now() - t0)}ms`);

      // Pre-fetch customers & suppliers for caching
      const dbCustomersArray = await Customer.find({ company: companyId }, '_id name').lean();
      const customerMap = new Map(dbCustomersArray.map(c => [c.name, c]));
      const dbSuppliersArray = await Supplier.find({ company: companyId }, '_id name').lean();
      const supplierMap = new Map(dbSuppliersArray.map(s => [s.name, s]));

      // 4. Products
      console.log('🔄 Syncing Products (Stock Items)...');
      t0 = Date.now();
      const stockItems = await executeQuery(
        connection,
        'SELECT guid, name, parent, category, alias, description, notes, part_number, uom, closing_balance, closing_rate FROM mst_stock_item'
      );
      const productOps = [];
      const inventoryOps = [];
      for (const p of stockItems) {
        const closingRate = Math.abs(parseFloat(p.closing_rate) || 0);
        const stockVal = parseFloat(p.closing_balance) || 0;
        productOps.push({
          updateOne: {
            filter: { tallyGuid: p.guid, company: companyId },
            update: {
              $set: {
                name: p.name, sku: p.part_number || p.alias || p.guid.slice(0, 8).toUpperCase(), brand: p.parent || 'Tally',
                category: p.category || 'Other', unit: p.uom || 'kg', price: closingRate || 0, stock: stockVal,
                description: p.description || p.notes || '', isActive: true, company: companyId
              }
            },
            upsert: true
          }
        });
      }
      stats.products += await executeBulkWriteInBatches(Product, productOps);
      
      const dbProductsArray = await Product.find({ company: companyId }, '_id name tallyGuid').lean();
      const productMapByName = new Map(dbProductsArray.map(p => [p.name, p]));
      
      if (defaultWarehouse) {
        for (const p of stockItems) {
          const dbProduct = productMapByName.get(p.name);
          if (dbProduct) {
             const stockVal = parseFloat(p.closing_balance) || 0;
             inventoryOps.push({
               updateOne: {
                 filter: { product: dbProduct._id, warehouse: defaultWarehouse._id, company: companyId },
                 update: { $set: { quantity: stockVal } },
                 upsert: true
               }
             });
          }
        }
        await executeBulkWriteInBatches(Inventory, inventoryOps);
      }
      console.log(`   ⏱️ Products took ${(Date.now() - t0)}ms`);

      // 5. Batches
      console.log('🔄 Syncing Batches...');
      t0 = Date.now();
      await Batch.updateMany({ company: companyId }, { $set: { quantity: 0, value: 0 } });
      const openingBatches = await executeQuery(connection, 'SELECT name, item, opening_balance, opening_rate, opening_value, godown, manufactured_on FROM mst_opening_batch_allocation');
      const batchOps = [];
      for (const ob of openingBatches) {
        if (!ob.name || ob.name.trim() === '') continue;
        const dbProduct = productMapByName.get(ob.item);
        let dbWarehouse = ob.godown ? (warehouseMap.get(ob.godown) || defaultWarehouse) : defaultWarehouse;
        if (dbProduct) {
          batchOps.push({
            updateOne: {
              filter: { name: ob.name, product: dbProduct._id, company: companyId },
              update: {
                $set: {
                  productName: dbProduct.name, warehouse: dbWarehouse ? dbWarehouse._id : null, warehouseName: dbWarehouse ? dbWarehouse.name : null,
                  rate: parseFloat(ob.opening_rate) || 0, manufacturedOn: ob.manufactured_on ? new Date(ob.manufactured_on) : null
                },
                $inc: { quantity: parseFloat(ob.opening_balance) || 0, value: parseFloat(ob.opening_value) || 0 }
              },
              upsert: true
            }
          });
        }
      }
      
      const trnBatches = await executeQuery(connection, 'SELECT guid, item, name, quantity, amount, godown, destination_godown, tracking_number FROM trn_batch');
      for (const tb of trnBatches) {
        if (!tb.name || tb.name.trim() === '') continue;
        const dbProduct = productMapByName.get(tb.item);
        let dbWarehouse = tb.godown ? (warehouseMap.get(tb.godown) || defaultWarehouse) : defaultWarehouse;
        if (dbProduct) {
          batchOps.push({
            updateOne: {
              filter: { name: tb.name, product: dbProduct._id, company: companyId },
              update: {
                $set: { tallyGuid: tb.guid, productName: dbProduct.name, warehouse: dbWarehouse ? dbWarehouse._id : null, warehouseName: dbWarehouse ? dbWarehouse.name : null },
                $inc: { quantity: parseFloat(tb.quantity) || 0, value: parseFloat(tb.amount) || 0 }
              },
              upsert: true
            }
          });
        }
      }
      stats.batches += await executeBulkWriteInBatches(Batch, batchOps);
      console.log(`   ⏱️ Batches took ${(Date.now() - t0)}ms`);

      // --- Phase 2: Sequential Collections ---
      
      // Helper to dynamically get or create customer/supplier/product to keep cache hot
      async function getOrCreateCustomer(name) {
        let doc = customerMap.get(name);
        if (!doc) {
          doc = await Customer.create({ name, isActive: true, company: companyId });
          customerMap.set(name, doc);
        }
        return doc;
      }
      async function getOrCreateSupplier(name) {
        let doc = supplierMap.get(name);
        if (!doc) {
          doc = await Supplier.create({ name, isActive: true, company: companyId });
          supplierMap.set(name, doc);
        }
        return doc;
      }
      async function getOrCreateProduct(name, rate) {
        let doc = productMapByName.get(name);
        if (!doc) {
          doc = await Product.create({ name, brand: 'Tally', price: Math.abs(parseFloat(rate) || 0), weight: 1, company: companyId });
          productMapByName.set(name, doc);
        }
        return doc;
      }

      // 6. Invoices
      console.log('🔄 Syncing Sales Invoices...');
      t0 = Date.now();
      const salesVouchers = await executeQuery(
        connection,
        `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
         FROM trn_voucher 
         WHERE voucher_type = 'Sales' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Sales')`
      );
      
      // Batch processing for invoices
      const invoiceOps = [];
      const CHUNK_SIZE = 100;
      console.log(`📊 Found ${salesVouchers.length} sales invoices to process.`);
      let chunkStartTime = Date.now();

      try {
        console.log("Starting invoice chunk loop");
        for (let i = 0; i < salesVouchers.length; i += CHUNK_SIZE) {
          const chunk = salesVouchers.slice(i, i + CHUNK_SIZE);
          
          console.log(`Before Promise.all for chunk ${i}`);
          await Promise.all(chunk.map(async (v) => {
            try {
              const dbCustomer = await getOrCreateCustomer(v.party_name);
              const invItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount, godown FROM trn_inventory WHERE guid = ?', [v.guid]);
              const items = [];
              let subtotal = 0;
              for (const itemRow of invItemsRows) {
                const dbProduct = await getOrCreateProduct(itemRow.item, itemRow.rate);
                const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
                const unitPrice = Math.abs(parseFloat(itemRow.rate) || 0);
                const discountVal = Math.abs(parseFloat(itemRow.discount_amount) || 0);
                const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
                subtotal += lineTotal;
                items.push({
                  product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitPrice,
                  discount: discountVal > 0 ? Math.round((discountVal / (qty * unitPrice)) * 100) : 0, lineTotal
                });
              }

              const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
              let totalAmount = 0, gstAmount = 0;
              let hasBankOrCash = false;
              for (const acc of accRows) {
                const accAmount = Math.abs(parseFloat(acc.amount) || 0);
                if (acc.ledger === v.party_name) totalAmount = accAmount;
                const ledgerUpper = acc.ledger.toUpperCase();
                if (ledgerUpper.includes('CGST') || ledgerUpper.includes('SGST') || ledgerUpper.includes('IGST') || ledgerUpper.includes('GST')) gstAmount += accAmount;
                if (ledgerUpper.includes('CASH') || ledgerUpper.includes('BANK') || ledgerUpper.includes('SBI') || ledgerUpper.includes('HDFC') || ledgerUpper.includes('ICICI')) hasBankOrCash = true;
              }
              if (totalAmount === 0) totalAmount = subtotal + gstAmount;

              const gstRate = subtotal > 0 ? Math.round((gstAmount / subtotal) * 100) : 5;
              const status = hasBankOrCash ? 'Paid' : 'Credit';
              const paymentType = hasBankOrCash ? 'Cash' : 'Credit';
              const paidAmount = hasBankOrCash ? totalAmount : 0;
              const invoiceNumber = v.voucher_number ? `${v.voucher_number}-${v.guid.slice(0, 4).toUpperCase()}` : `TI-${v.guid.slice(0, 8).toUpperCase()}`;

              invoiceOps.push({
                updateOne: {
                  filter: { company: companyId, invoiceNumber },
                  update: {
                    $set: {
                      tallyGuid: v.guid, customer: dbCustomer._id, customerName: dbCustomer.name, items, subtotal, gstRate, gstAmount,
                      total: totalAmount, paidAmount, paymentType, status, date: new Date(v.date), dueDate: new Date(v.date),
                      notes: v.narration || '', warehouse: defaultWarehouse ? defaultWarehouse._id : null
                    }
                  },
                  upsert: true
                }
              });
            } catch (innerErr) {
              console.error(`Error processing individual invoice ${v.guid}:`, innerErr);
            }
          }));
          console.log(`After Promise.all for chunk ${i}`);

          const currentCount = Math.min(i + CHUNK_SIZE, salesVouchers.length);
          const timeTaken = Date.now() - chunkStartTime;
          console.log(`Processing invoice ${currentCount}/${salesVouchers.length} (took ${timeTaken}ms)`);
          chunkStartTime = Date.now(); // reset for next chunk
        }
        console.log("Invoice chunk loop completed");

        console.time("Invoice bulkWrite");
        console.log("Before executeBulkWriteInBatches for Invoices");
        stats.invoices += await executeBulkWriteInBatches(Invoice, invoiceOps);
        console.log("After executeBulkWriteInBatches for Invoices");
        console.timeEnd("Invoice bulkWrite");
        console.log("Invoice bulkWrite completed");
        
        console.log("Leaving invoice sync");
        console.log("Invoice sync finished successfully");
      } catch (err) {
        console.error("Error during entire invoice sync process:", err);
      }

      console.log(`   ⏱️ Invoices took ${(Date.now() - t0)}ms`);

      // 7. Sync Purchase Orders
      console.log('🔄 Syncing Purchase Orders...');
      t0 = Date.now();
      const poVouchers = await executeQuery(
        connection,
        `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
         FROM trn_voucher 
         WHERE voucher_type = 'Purchase Order' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Purchase Order')`
      );
      const poOps = [];
      for (let i = 0; i < poVouchers.length; i += CHUNK_SIZE) {
        const chunk = poVouchers.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (v) => {
          const dbSupplier = await getOrCreateSupplier(v.party_name);
          const poItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
          const items = [];
          let subtotal = 0;
          for (const itemRow of poItemsRows) {
            const dbProduct = await getOrCreateProduct(itemRow.item, itemRow.rate);
            const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
            const unitCost = Math.abs(parseFloat(itemRow.rate) || 0);
            const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
            subtotal += lineTotal;
            items.push({ product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitCost, lineTotal });
          }
          const poNumber = v.voucher_number ? `${v.voucher_number}-${v.guid.slice(0, 4).toUpperCase()}` : `TPO-${v.guid.slice(0, 8).toUpperCase()}`;
          poOps.push({
            updateOne: {
              filter: { company: companyId, poNumber }, // Fixed for potential unique index issues
              update: {
                $set: {
                  tallyGuid: v.guid, supplier: dbSupplier._id, supplierName: dbSupplier.name, items, subtotal, totalAmount: subtotal,
                  status: 'Ordered', date: new Date(v.date), expectedDate: new Date(v.date), notes: v.narration || '',
                  warehouse: defaultWarehouse ? defaultWarehouse._id : null
                }
              },
              upsert: true
            }
          });
        }));
      }
      stats.purchaseOrders += await executeBulkWriteInBatches(PurchaseOrder, poOps);
      console.log(`   ⏱️ Purchase Orders took ${(Date.now() - t0)}ms`);

      // 8. Receipts (Sequential due to dependencies on invoices)
      console.log('🔄 Syncing Receipt Vouchers...');
      t0 = Date.now();
      const receiptVouchers = await executeQuery(
        connection,
        `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
         FROM trn_voucher 
         WHERE voucher_type = 'Receipt' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Receipt')`
      );
      // Receipts update existing invoices, so bulkWrite isn't as straightforward unless we pre-fetch pending invoices.
      // Keeping sequential loop for receipts to accurately distribute amounts across invoices.
      for (const v of receiptVouchers) {
        try {
          const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
          let amountReceived = 0, paymentType = 'Bank Transfer', partyName = v.party_name;
          for (const acc of accRows) {
            const accAmount = Math.abs(parseFloat(acc.amount) || 0);
            const ledgerUpper = acc.ledger.toUpperCase();
            if (acc.ledger === partyName) amountReceived = accAmount;
            if (ledgerUpper.includes('CASH')) paymentType = 'Cash';
            else if (ledgerUpper.includes('BANK') || ledgerUpper.includes('SBI') || ledgerUpper.includes('HDFC') || ledgerUpper.includes('ICICI')) paymentType = 'Bank Transfer';
            else if (ledgerUpper.includes('UPI')) paymentType = 'UPI';
          }
          if (amountReceived <= 0 || !partyName) continue;
          
          const dbCustomer = customerMap.get(partyName);
          if (!dbCustomer) continue;
          
          let remainingToApply = amountReceived;
          const pendingInvoices = await Invoice.find({ customer: dbCustomer._id, company: companyId, status: { $in: ['Credit', 'Overdue', 'Pending'] } }).sort({ dueDate: 1 });
          if (pendingInvoices.length === 0) continue;
          
          for (const inv of pendingInvoices) {
            if (remainingToApply <= 0) break;
            if (inv.payments && inv.payments.some(p => p.tallyReceiptGuid === v.guid)) {
              remainingToApply = 0; break;
            }
            const invRemainingBalance = inv.total - inv.paidAmount;
            if (invRemainingBalance <= 0) continue;
            
            const amountToApply = Math.min(remainingToApply, invRemainingBalance);
            inv.paidAmount += amountToApply;
            remainingToApply -= amountToApply;
            
            inv.payments.push({ amount: amountToApply, paymentType, referenceNumber: v.reference_number || v.voucher_number || '', tallyReceiptGuid: v.guid, date: new Date(v.date) });
            if (inv.paidAmount >= inv.total) { inv.status = 'Paid'; inv.paymentType = inv.payments.length > 1 ? 'Split' : paymentType; }
            await inv.save();
            stats.receiptsApplied++;
          }
        } catch (err) {}
      }
      console.log(`   ⏱️ Receipts took ${(Date.now() - t0)}ms`);

      // 9. Sync Purchase Bills
      console.log('🔄 Syncing Purchase Bills...');
      t0 = Date.now();
      const purchaseVouchers = await executeQuery(
        connection,
        `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
         FROM trn_voucher 
         WHERE voucher_type = 'Purchase' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Purchase')`
      );
      const pbOps = [];
      for (const v of purchaseVouchers) {
        try {
          const dbSupplier = await getOrCreateSupplier(v.party_name);
          const poItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
          const items = [];
          let subtotal = 0;
          for (const itemRow of poItemsRows) {
            const dbProduct = await getOrCreateProduct(itemRow.item, itemRow.rate);
            const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
            const unitCost = Math.abs(parseFloat(itemRow.rate) || 0);
            const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
            subtotal += lineTotal;
            items.push({ product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitCost, lineTotal });
          }

          let existingPO = null;
          if (v.reference_number) existingPO = await PurchaseOrder.findOne({ poNumber: v.reference_number, company: companyId });
          if (!existingPO) existingPO = await PurchaseOrder.findOne({ supplier: dbSupplier._id, totalAmount: subtotal, company: companyId, status: { $nin: ['Received', 'Cancelled'] } });

          if (existingPO) {
            existingPO.status = 'Received'; existingPO.tallyGuid = v.guid; existingPO.receivedDate = new Date(v.date);
            await existingPO.save();
          } else {
            const pbNumber = v.voucher_number ? `${v.voucher_number}-${v.guid.slice(0, 4).toUpperCase()}` : `PB-${v.guid.slice(0, 8).toUpperCase()}`;
            pbOps.push({
              updateOne: {
                filter: { company: companyId, poNumber: pbNumber }, // Adjusted for unique index if any
                update: {
                  $set: {
                    tallyGuid: v.guid, supplier: dbSupplier._id, supplierName: dbSupplier.name, items, subtotal, totalAmount: subtotal,
                    status: 'Received', date: new Date(v.date), expectedDate: new Date(v.date), receivedDate: new Date(v.date),
                    notes: v.narration || '', warehouse: defaultWarehouse ? defaultWarehouse._id : null
                  }
                },
                upsert: true
              }
            });
          }
        } catch (err) {}
      }
      stats.purchaseBills += await executeBulkWriteInBatches(PurchaseOrder, pbOps);
      console.log(`   ⏱️ Purchase Bills took ${(Date.now() - t0)}ms`);

      // 10. Sync Credit Note Vouchers
      console.log('🔄 Syncing Credit Notes...');
      t0 = Date.now();
      const cnVouchers = await executeQuery(
        connection,
        `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
         FROM trn_voucher 
         WHERE voucher_type = 'Credit Note' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Credit Note')`
      );
      const cnOps = [];
      for (const v of cnVouchers) {
        try {
          const dbCustomer = customerMap.get(v.party_name);
          if (!dbCustomer) continue;

          const cnItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
          const items = [];
          let subtotal = 0;
          for (const itemRow of cnItemsRows) {
            const dbProduct = productMapByName.get(itemRow.item);
            if (!dbProduct) continue;
            const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
            const unitPrice = Math.abs(parseFloat(itemRow.rate) || 0);
            const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
            subtotal += lineTotal;
            items.push({ product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitPrice, lineTotal });
          }

          const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
          let totalAmount = subtotal;
          for (const acc of accRows) { if (acc.ledger === v.party_name) totalAmount = Math.abs(parseFloat(acc.amount) || 0); }

          let origInvoice = null;
          if (v.reference_number) origInvoice = await Invoice.findOne({ invoiceNumber: v.reference_number, company: companyId });
          if (!origInvoice) origInvoice = await Invoice.findOne({ customer: dbCustomer._id, company: companyId }).sort({ createdAt: -1 });

          if (origInvoice) {
            const cnNumber = v.voucher_number ? `${v.voucher_number}-${v.guid.slice(0, 4).toUpperCase()}` : `CN-${v.guid.slice(0, 8).toUpperCase()}`;
            cnOps.push({
              updateOne: {
                filter: { company: companyId, creditNoteNumber: cnNumber },
                update: {
                  $set: {
                    tallyGuid: v.guid, originalInvoice: origInvoice._id, originalInvoiceNumber: origInvoice.invoiceNumber,
                    customer: dbCustomer._id, customerName: dbCustomer.name, items, reason: v.narration || 'Synced from Tally',
                    totalAmount, status: 'Issued', date: new Date(v.date), warehouse: defaultWarehouse ? defaultWarehouse._id : null
                  }
                },
                upsert: true
              }
            });
          }
        } catch (err) {}
      }
      stats.creditNotes += await executeBulkWriteInBatches(CreditNote, cnOps);
      console.log(`   ⏱️ Credit Notes took ${(Date.now() - t0)}ms`);

      // 11. Sync Quotations
      console.log('🔄 Syncing Sales Orders (Quotations)...');
      t0 = Date.now();
      const soVouchers = await executeQuery(
        connection,
        `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
         FROM trn_voucher 
         WHERE voucher_type = 'Sales Order' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Sales Order')`
      );
      const qtOps = [];
      for (let i = 0; i < soVouchers.length; i += CHUNK_SIZE) {
        const chunk = soVouchers.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (v) => {
          const dbCustomer = await getOrCreateCustomer(v.party_name);
          const soItemsRows = await executeQuery(connection, 'SELECT item, quantity, rate, amount, discount_amount FROM trn_inventory WHERE guid = ?', [v.guid]);
          const items = [];
          let subtotal = 0;
          for (const itemRow of soItemsRows) {
            const dbProduct = await getOrCreateProduct(itemRow.item, itemRow.rate);
            const qty = Math.abs(parseFloat(itemRow.quantity) || 0);
            const unitPrice = Math.abs(parseFloat(itemRow.rate) || 0);
            const discountVal = Math.abs(parseFloat(itemRow.discount_amount) || 0);
            const lineTotal = Math.abs(parseFloat(itemRow.amount) || 0);
            subtotal += lineTotal;
            items.push({ product: dbProduct._id, productName: dbProduct.name, quantity: qty, unitPrice, discount: discountVal > 0 ? Math.round((discountVal / (qty * unitPrice)) * 100) : 0, lineTotal });
          }
          const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
          let totalAmount = subtotal, gstAmount = 0;
          for (const acc of accRows) {
            const accAmount = Math.abs(parseFloat(acc.amount) || 0);
            if (acc.ledger === v.party_name) totalAmount = accAmount;
            const ledgerUpper = acc.ledger.toUpperCase();
            if (ledgerUpper.includes('CGST') || ledgerUpper.includes('SGST') || ledgerUpper.includes('IGST') || ledgerUpper.includes('GST')) gstAmount += accAmount;
          }
          if (totalAmount === 0 || totalAmount === subtotal) totalAmount = subtotal + gstAmount;
          const gstRate = subtotal > 0 ? Math.round((gstAmount / subtotal) * 100) : 5;
          const qNumber = v.voucher_number ? `${v.voucher_number}-${v.guid.slice(0, 4).toUpperCase()}` : `SO-${v.guid.slice(0, 8).toUpperCase()}`;

          qtOps.push({
            updateOne: {
              filter: { company: companyId, quotationNumber: qNumber },
              update: {
                $set: {
                  tallyGuid: v.guid, customer: dbCustomer._id, customerName: dbCustomer.name, items, subtotal, gstRate, gstAmount,
                  total: totalAmount, status: 'Sent', date: new Date(v.date), validUntil: new Date(new Date(v.date).getTime() + 30 * 24 * 60 * 60 * 1000), notes: v.narration || ''
                }
              },
              upsert: true
            }
          });
        }));
      }
      stats.quotations += await executeBulkWriteInBatches(Quotation, qtOps);
      console.log(`   ⏱️ Quotations took ${(Date.now() - t0)}ms`);

      // 12. Expenses
      console.log('🔄 Syncing Expenses (Payment Vouchers)...');
      t0 = Date.now();
      try {
        const expenseLedgerRows = await executeQuery(
          connection,
          `SELECT l.name 
           FROM mst_ledger l
           LEFT JOIN mst_group g ON l.parent = g.name
           WHERE l.parent IN ('Direct Expenses', 'Indirect Expenses') 
              OR g.primary_group IN ('Direct Expenses', 'Indirect Expenses') 
              OR g.parent IN ('Direct Expenses', 'Indirect Expenses')`
        );
        const expenseLedgerNames = new Set(expenseLedgerRows.map(r => r.name));
        const paymentVouchers = await executeQuery(
          connection,
          `SELECT guid, date, voucher_type, voucher_number, reference_number, reference_date, narration, party_name 
           FROM trn_voucher 
           WHERE voucher_type = 'Payment' OR voucher_type IN (SELECT name FROM mst_vouchertype WHERE parent = 'Payment')`
        );
        
        const expOps = [];
        for (const v of paymentVouchers) {
          const accRows = await executeQuery(connection, 'SELECT ledger, amount FROM trn_accounting WHERE guid = ?', [v.guid]);
          let expenseLedgerName = null, amount = 0, paymentMethod = 'Cash';
          for (const acc of accRows) {
            const accAmount = Math.abs(parseFloat(acc.amount) || 0);
            const ledgerUpper = acc.ledger.toUpperCase();
            if (expenseLedgerNames.has(acc.ledger)) { expenseLedgerName = acc.ledger; amount = accAmount; }
            if (ledgerUpper.includes('CASH')) paymentMethod = 'Cash';
            else if (ledgerUpper.includes('BANK') || ledgerUpper.includes('SBI') || ledgerUpper.includes('HDFC') || ledgerUpper.includes('ICICI')) paymentMethod = 'Bank Transfer';
            else if (ledgerUpper.includes('UPI')) paymentMethod = 'UPI';
            else if (ledgerUpper.includes('CHEQUE')) paymentMethod = 'Cheque';
          }
          if (expenseLedgerName && amount > 0) {
            expOps.push({
              updateOne: {
                filter: { tallyGuid: v.guid, company: companyId },
                update: {
                  $set: {
                    category: mapLedgerToExpenseCategory(expenseLedgerName), amount, description: v.narration || `Tally Expense: ${expenseLedgerName}`,
                    date: new Date(v.date), paymentMethod, reference: v.reference_number || v.voucher_number || '', status: 'Approved', company: companyId
                  }
                },
                upsert: true
              }
            });
          }
        }
        stats.expenses += await executeBulkWriteInBatches(Expense, expOps);
      } catch (expErr) { console.error('Error during Expense sync:', expErr.message); }
      console.log(`   ⏱️ Expenses took ${(Date.now() - t0)}ms`);

      // 13. Financial Metrics
      console.log('🔄 Syncing Financial Metrics...');
      t0 = Date.now();
      try {
        const ledgers = await executeQuery(connection, `SELECT l.name, l.parent, g.primary_group, g.parent as group_parent, l.closing_balance FROM mst_ledger l LEFT JOIN mst_group g ON l.parent = g.name`);
        let cashInHand = 0, bankAccounts = 0, currentAssets = 0, currentLiabilities = 0, capitalAccount = 0, loansLiability = 0, receivables = 0, payables = 0;
        for (const r of ledgers) {
          const balance = parseFloat(r.closing_balance) || 0;
          const parent = r.parent || '', primaryGroup = r.primary_group || '', groupParent = r.group_parent || '';
          const isCash = parent === 'Cash-in-Hand' || primaryGroup === 'Cash-in-Hand' || groupParent === 'Cash-in-Hand';
          const isBank = ['Bank Accounts', 'Bank OCC A/c', 'Bank OD A/c'].includes(parent) || ['Bank Accounts', 'Bank OCC A/c', 'Bank OD A/c'].includes(primaryGroup) || ['Bank Accounts', 'Bank OD A/c', 'Bank OCC A/c'].includes(groupParent);
          const isCurrentAsset = parent === 'Current Assets' || primaryGroup === 'Current Assets' || groupParent === 'Current Assets' || isCash || isBank;
          const isCurrentLiability = parent === 'Current Liabilities' || primaryGroup === 'Current Liabilities' || groupParent === 'Current Liabilities';
          const isCapital = parent === 'Capital Account' || primaryGroup === 'Capital Account' || groupParent === 'Capital Account';
          const isLoanLiab = ['Loans (Liability)', 'Secured Loans', 'Unsecured Loans'].includes(parent) || ['Loans (Liability)', 'Secured Loans', 'Unsecured Loans'].includes(primaryGroup) || ['Loans (Liability)', 'Secured Loans', 'Unsecured Loans'].includes(groupParent);
          const isReceivable = parent === 'Sundry Debtors' || primaryGroup === 'Sundry Debtors' || groupParent === 'Sundry Debtors';
          const isPayable = parent === 'Sundry Creditors' || primaryGroup === 'Sundry Creditors' || groupParent === 'Sundry Creditors';

          if (isCash) cashInHand += Math.abs(balance);
          if (isBank) bankAccounts += Math.abs(balance);
          if (isCurrentAsset) currentAssets += Math.abs(balance);
          if (isCurrentLiability) currentLiabilities += Math.abs(balance);
          if (isCapital) capitalAccount += Math.abs(balance);
          if (isLoanLiab) loansLiability += Math.abs(balance);
          if (isReceivable) receivables += Math.abs(balance);
          if (isPayable) payables += Math.abs(balance);
        }
        await FinancialMetric.findOneAndUpdate(
          { company: companyId },
          { $set: { cashInHand, bankAccounts, currentAssets, currentLiabilities, workingCapital: currentAssets - currentLiabilities, capitalAccount, loansLiability, receivables, payables, lastSynced: new Date() } },
          { upsert: true }
        );
      } catch (metricErr) {}
      console.log(`   ⏱️ Financial Metrics took ${(Date.now() - t0)}ms`);

      // Update SyncMetadata success
      await SyncMetadata.findOneAndUpdate({ company: companyId }, { status: 'Idle', lastSuccessfulSync: new Date() }, { upsert: true });

    } // end stagingDbs loop

    const duration = ((new Date() - stats.startTime) / 1000).toFixed(1);
    console.log(`✅ Tally sync completed in ${duration}s! Sync stats:`, stats);

    const app = require('../index'); 
    if (app && app.locals && app.locals.io) {
       app.locals.io.emit('TALLY_SYNC_COMPLETED', { stats, timestamp: new Date() });
    }

    return { success: true, message: `Successfully synchronized Tally database.`, stats };

  } catch (err) {
    console.error('❌ Tally sync error:', err);
    if (targetCompanyId) {
      await SyncMetadata.findOneAndUpdate({ company: targetCompanyId }, { status: 'Error', lastError: err.message }, { upsert: true });
    }
    return { success: false, message: err.message, error: err };
  } finally {
    isSyncRunning = false;
    await closeDbConnection(baseConnection || connection);
  }
}

function startSyncScheduler() {
  if (syncIntervalId) {
    console.log('Tally Sync scheduler is already running.');
    return;
  }

  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS) || 300000;
  console.log(`⏰ Starting Tally Sync background worker (Interval: ${pollInterval}ms)`);
  
  const runSync = async () => {
    try {
      await syncTallyData();
    } catch (err) {
      console.error('Error during scheduled Tally sync:', err.message);
    } finally {
      // Schedule the next run only after this one completes
      syncIntervalId = setTimeout(runSync, pollInterval);
    }
  };

  // Run once on startup
  syncIntervalId = setTimeout(() => {
    runSync();
  }, 5000);
}

/**
 * Stops the background scheduler
 */
function stopSyncScheduler() {
  if (syncIntervalId) {
    clearTimeout(syncIntervalId);
    syncIntervalId = null;
    console.log('🛑 Tally Sync background worker stopped.');
  }
}

module.exports = {
  syncTallyData,
  startSyncScheduler,
  stopSyncScheduler,
  getDbConnection,
  closeDbConnection
};
