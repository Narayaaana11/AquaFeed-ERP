const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');

// Webhook endpoint for Tally TDL to push data instantly
router.post('/webhook', async (req, res) => {
  try {
    const clientSecret = req.headers['x-tally-secret'];
    const serverSecret = process.env.TALLY_BRIDGE_SECRET;

    if (!serverSecret || clientSecret !== serverSecret) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid Tally Bridge Secret.' });
    }

    const { type, data, companyName } = req.body;
    
    const { syncTallyData } = require('../services/tallySyncService');

    // Find company by name
    let company = await Company.findOne({ name: companyName });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Process specific fast-path updates if data is provided
    if (type === 'Invoice' && data?.items) {
      const { items } = data;
      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          { name: item.name, company: company._id },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (req.app.locals.io && product) {
          req.app.locals.io.to(`products_${company._id}`).emit('STOCK_UPDATED', {
            productId: product._id,
            newStock: product.stock,
            companyId: company._id
          });
        }
      }
    } else if (type === 'Purchase' && data?.items) {
      const { items } = data;
      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          { name: item.name, company: company._id },
          { $inc: { stock: item.quantity } },
          { new: true }
        );
        if (req.app.locals.io && product) {
          req.app.locals.io.to(`products_${company._id}`).emit('STOCK_UPDATED', {
            productId: product._id,
            newStock: product.stock,
            companyId: company._id
          });
        }
      }
    }

    // Regardless of what was pushed instantly, trigger a full background sync 
    // to ensure Customers, Suppliers, Warehouses, and all related records are perfectly in sync.
    // We run this asynchronously so the webhook responds immediately.
    setTimeout(() => {
      console.log(`⚡ Real-time webhook triggered full sync for type: ${type}`);
      syncTallyData(company._id).catch(err => console.error('Webhook sync error:', err));
    }, 1000);

    // Alert frontend that new data is incoming
    if (req.app.locals.io) {
       req.app.locals.io.to(`company_${company._id}`).emit('TALLY_SYNC_STARTED', { 
         message: 'Real-time sync initiated from Tally',
         companyId: company._id
       });
    }

    res.json({ success: true, message: `Real-time data flow initiated for ${type}` });
  } catch (error) {
    console.error('Tally webhook error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
