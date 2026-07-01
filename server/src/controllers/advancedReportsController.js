const { getDbConnection, closeDbConnection } = require('../services/tallySyncService');
const Company = require('../models/Company');

async function getTallyDb(companyId) {
  const baseConnection = await getDbConnection();
  const dbTech = (process.env.SQL_TALLY_DB_TECH || 'mssql').toLowerCase();
  
  if (dbTech !== 'mongodb') {
    await closeDbConnection(baseConnection);
    throw new Error("Advanced reports currently only support MongoDB staging databases.");
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

// @desc    Get Trial Balance directly from Tally data
// @route   GET /api/advanced-reports/trial-balance
// @access  Private
exports.getTrialBalance = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    const ledgers = await db.collection('mst_ledger').aggregate([
      { $match: { closing_balance: { $ne: 0 } } },
      { 
        $lookup: {
          from: 'mst_group',
          localField: 'parent',
          foreignField: 'name',
          as: 'group'
        }
      },
      { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          parent: 1,
          primaryGroup: '$group.primary_group',
          balance: { $toDouble: '$closing_balance' }
        }
      },
      { $sort: { primaryGroup: 1, parent: 1, name: 1 } }
    ]).toArray();

    // Map into Dr/Cr based on balance sign
    const trialBalance = ledgers.map(l => ({
      name: l.name,
      parent: l.parent,
      primaryGroup: l.primaryGroup,
      debit: l.balance < 0 ? Math.abs(l.balance) : 0,
      credit: l.balance > 0 ? l.balance : 0
    }));

    res.status(200).json({ success: true, data: trialBalance });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};

// @desc    Get Profit & Loss directly from Tally data
// @route   GET /api/advanced-reports/profit-loss
// @access  Private
exports.getProfitLoss = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    const revenueLedgers = await db.collection('mst_ledger').aggregate([
      { $match: { is_revenue: 1, closing_balance: { $ne: 0 } } },
      { 
        $lookup: {
          from: 'mst_group',
          localField: 'parent',
          foreignField: 'name',
          as: 'group'
        }
      },
      { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          parent: 1,
          primaryGroup: '$group.primary_group',
          balance: { $toDouble: '$closing_balance' }
        }
      }
    ]).toArray();

    // Organize into groups
    const pl = {
      sales: [],
      purchases: [],
      directExpenses: [],
      directIncomes: [],
      indirectExpenses: [],
      indirectIncomes: []
    };

    let grossProfit = 0;
    let netProfit = 0;

    revenueLedgers.forEach(l => {
      const p = l.primaryGroup || l.parent;
      if (p === 'Sales Accounts') {
        pl.sales.push(l);
        grossProfit += l.balance;
      } else if (p === 'Purchase Accounts') {
        pl.purchases.push(l);
        grossProfit += l.balance; // debit balances are negative
      } else if (p === 'Direct Expenses') {
        pl.directExpenses.push(l);
        grossProfit += l.balance;
      } else if (p === 'Direct Incomes') {
        pl.directIncomes.push(l);
        grossProfit += l.balance;
      } else if (p === 'Indirect Expenses') {
        pl.indirectExpenses.push(l);
      } else if (p === 'Indirect Incomes') {
        pl.indirectIncomes.push(l);
      } else {
        // Fallback for custom groups
        if (l.balance < 0) pl.indirectExpenses.push(l);
        else pl.indirectIncomes.push(l);
      }
    });

    netProfit = grossProfit;
    pl.indirectExpenses.forEach(l => netProfit += l.balance);
    pl.indirectIncomes.forEach(l => netProfit += l.balance);

    res.status(200).json({ 
      success: true, 
      data: {
        ...pl,
        grossProfit,
        netProfit
      } 
    });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};

// @desc    Get Balance Sheet directly from Tally data
// @route   GET /api/advanced-reports/balance-sheet
// @access  Private
exports.getBalanceSheet = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    // First we need Net Profit from P&L to balance the sheet
    const plAgg = await db.collection('mst_ledger').aggregate([
      { $match: { is_revenue: 1, closing_balance: { $ne: 0 } } },
      { $group: { _id: null, netProfit: { $sum: { $toDouble: '$closing_balance' } } } }
    ]).toArray();
    const netProfit = plAgg[0]?.netProfit || 0;

    const bsLedgers = await db.collection('mst_ledger').aggregate([
      { $match: { is_revenue: 0, closing_balance: { $ne: 0 } } },
      { 
        $lookup: {
          from: 'mst_group',
          localField: 'parent',
          foreignField: 'name',
          as: 'group'
        }
      },
      { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          parent: 1,
          primaryGroup: '$group.primary_group',
          balance: { $toDouble: '$closing_balance' }
        }
      }
    ]).toArray();

    const bs = {
      capitalAccount: [],
      loansLiability: [],
      currentLiabilities: [],
      fixedAssets: [],
      investments: [],
      currentAssets: [],
      suspense: []
    };

    let totalLiabilities = 0;
    let totalAssets = 0;

    bsLedgers.forEach(l => {
      const p = l.primaryGroup || l.parent;
      if (p === 'Capital Account') {
        bs.capitalAccount.push(l);
        totalLiabilities += l.balance;
      } else if (p === 'Loans (Liability)') {
        bs.loansLiability.push(l);
        totalLiabilities += l.balance;
      } else if (p === 'Current Liabilities' || p === 'Sundry Creditors' || p === 'Duties & Taxes') {
        bs.currentLiabilities.push(l);
        totalLiabilities += l.balance;
      } else if (p === 'Fixed Assets') {
        bs.fixedAssets.push(l);
        totalAssets += Math.abs(l.balance);
      } else if (p === 'Investments') {
        bs.investments.push(l);
        totalAssets += Math.abs(l.balance);
      } else if (p === 'Current Assets' || p === 'Sundry Debtors' || p === 'Cash-in-Hand' || p === 'Bank Accounts') {
        bs.currentAssets.push(l);
        totalAssets += Math.abs(l.balance); // Assets are negative in Tally's balance convention (debits are negative)
      } else if (p === 'Suspense A/c') {
        bs.suspense.push(l);
        if (l.balance > 0) totalLiabilities += l.balance;
        else totalAssets += Math.abs(l.balance);
      } else {
        if (l.balance > 0) {
          bs.currentLiabilities.push(l);
          totalLiabilities += l.balance;
        } else {
          bs.currentAssets.push(l);
          totalAssets += Math.abs(l.balance);
        }
      }
    });

    // Add Net Profit to Capital/Liabilities
    if (netProfit > 0) {
      bs.capitalAccount.push({ name: 'Profit & Loss A/c', balance: netProfit, parent: 'Capital Account' });
      totalLiabilities += netProfit;
    } else if (netProfit < 0) {
      bs.capitalAccount.push({ name: 'Profit & Loss A/c', balance: netProfit, parent: 'Capital Account' });
      totalLiabilities += netProfit;
    }

    res.status(200).json({ 
      success: true, 
      data: {
        ...bs,
        totalLiabilities,
        totalAssets,
        netProfit
      } 
    });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};

// @desc    Get GST Summary directly from Tally data
// @route   GET /api/advanced-reports/gst-summary
// @access  Private
exports.getGstSummary = async (req, res, next) => {
  let conn;
  try {
    conn = await getTallyDb(req.companyId);
    const { db } = conn;

    // Sum GST ledgers (usually under 'Duties & Taxes' or named CGST/SGST)
    const gstLedgers = await db.collection('mst_ledger').aggregate([
      { 
        $match: { 
          closing_balance: { $ne: 0 },
          $or: [
            { name: { $regex: /gst/i } },
            { parent: 'Duties & Taxes' }
          ]
        } 
      },
      {
        $project: {
          name: 1,
          balance: { $toDouble: '$closing_balance' }
        }
      }
    ]).toArray();

    const gst = {
      cgst: 0,
      sgst: 0,
      igst: 0,
      others: 0
    };

    gstLedgers.forEach(l => {
      const name = l.name.toLowerCase();
      if (name.includes('cgst')) gst.cgst += l.balance;
      else if (name.includes('sgst')) gst.sgst += l.balance;
      else if (name.includes('igst')) gst.igst += l.balance;
      else gst.others += l.balance;
    });

    res.status(200).json({ success: true, data: { details: gstLedgers, summary: gst } });
  } catch (err) {
    next(err);
  } finally {
    if (conn) await conn.close();
  }
};
