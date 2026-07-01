const { getDbConnection, closeDbConnection } = require('../services/tallySyncService');
const Company = require('../models/Company');

async function getTallyDb(companyId) {
  const baseConnection = await getDbConnection();
  const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();
  
  if (dbTech !== 'mongodb') {
    await closeDbConnection(baseConnection);
    throw new Error("Direct finance reports currently only support MongoDB staging databases.");
  }
  
  let stagingDbs = [];
  try {
    const adminDb = baseConnection.client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    
    stagingDbs = dbList.databases
      .filter(d => d.name.startsWith('tallydb_'))
      .map(d => d.name);
  } catch (err) {
    console.warn('⚠️ Could not list MongoDB databases:', err.message);
  }

  if (stagingDbs.length === 0) {
    stagingDbs = [process.env.SQL_TALLY_DB_NAME || 'tallydb'];
  }
  
  // Resolve actual company from companyId (handle 'all' object)
  let resolvedId = companyId;
  if (companyId && companyId.$in && companyId.$in.length > 0) {
    resolvedId = companyId.$in[0];
  }
  
  let targetDbName = stagingDbs[0]; // fallback
  if (resolvedId) {
    const company = await Company.findById(resolvedId);
    if (company && company.tallyGuid) {
      // Find the staging DB that matches this tallyGuid
      for (const dbName of stagingDbs) {
        try {
          const tempDb = baseConnection.client.db(dbName);
          const configDoc = await tempDb.collection('config').findOne({ name: 'company_info' });
          if (configDoc && configDoc.value) {
            const parsed = JSON.parse(configDoc.value);
            if (parsed.guid === company.tallyGuid) {
              targetDbName = dbName;
              break;
            }
          }
        } catch (e) {
          // ignore error and continue
        }
      }
    }
  }

  const db = baseConnection.client.db(targetDbName);
  
  return { db, close: () => closeDbConnection(baseConnection) };
}

// @desc    Get General Ledger entries for a specific account
// @route   GET /api/finance/ledger?account=...
// @access  Private
exports.getLedger = async (req, res, next) => {
  let conn;
  try {
    const account = req.query.account;
    if (!account) return res.status(400).json({ success: false, message: 'Account name is required' });

    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    const entries = await db.collection('trn_accounting').aggregate([
      { $match: { ledger: account } },
      { 
        $lookup: {
          from: 'trn_voucher',
          localField: 'guid',
          foreignField: 'guid',
          as: 'voucher'
        }
      },
      { $unwind: { path: '$voucher', preserveNullAndEmptyArrays: true } },
      { 
        $project: {
          date: '$voucher.date',
          type: '$voucher.voucher_type',
          number: '$voucher.voucher_number',
          amount: 1,
          narration: '$voucher.narration',
          guid: 1
        }
      },
      { $sort: { date: 1 } }
    ]).toArray();

    // Calculate running balance
    let balance = 0;
    const processedEntries = entries.map(entry => {
      const amt = parseFloat(entry.amount) || 0;
      balance += amt;
      return {
        ...entry,
        debit: amt < 0 ? Math.abs(amt) : 0,
        credit: amt > 0 ? amt : 0,
        balance
      };
    });

    res.status(200).json({ success: true, data: processedEntries });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};

// @desc    Get non-sales/purchase vouchers
// @route   GET /api/finance/journal
// @access  Private
exports.getJournal = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    const journals = await db.collection('trn_voucher').aggregate([
      { 
        $match: { 
          voucher_type: { $nin: ['Sales', 'Purchase', 'Sales Order', 'Purchase Order', 'Delivery Note', 'Receipt Note'] }
        } 
      },
      {
        $lookup: {
          from: 'trn_accounting',
          localField: 'guid',
          foreignField: 'guid',
          as: 'accounting'
        }
      },
      { $sort: { date: -1 } },
      { $limit: 100 }
    ]).toArray();

    res.status(200).json({ success: true, data: journals });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};

// @desc    Get bank book
// @route   GET /api/finance/bank-book
// @access  Private
exports.getBankBook = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    const entries = await db.collection('trn_bank').aggregate([
      {
        $lookup: {
          from: 'trn_voucher',
          localField: 'guid',
          foreignField: 'guid',
          as: 'voucher'
        }
      },
      { $unwind: { path: '$voucher', preserveNullAndEmptyArrays: true } },
      { $sort: { instrument_date: -1 } },
      { $limit: 200 }
    ]).toArray();

    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};

// @desc    Get bill-by-bill outstanding
// @route   GET /api/finance/outstanding
// @access  Private
exports.getOutstanding = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    const bills = await db.collection('trn_bill').aggregate([
      {
        $group: {
          _id: { ledger: "$ledger", name: "$name" },
          totalAmount: { $sum: { $toDouble: "$amount" } }
        }
      },
      { $match: { totalAmount: { $ne: 0 } } },
      { $sort: { "_id.ledger": 1 } }
    ]).toArray();

    const formattedBills = bills.map(b => ({
      ledger: b._id.ledger,
      billName: b._id.name,
      amount: b.totalAmount
    }));

    res.status(200).json({ success: true, data: formattedBills });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};
