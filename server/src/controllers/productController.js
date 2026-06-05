const Product = require('../models/Product');
const StockAdjustment = require('../models/StockAdjustment');
const { emitProductCreated, emitProductUpdate, emitProductDeleted, emitLowStockAlert } = require('../utils/websocket');

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { search, brand, stockStatus, page = 1, limit = 100 } = req.query;
    const query = { company: req.companyId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (brand && brand !== 'All Brands') query.brand = brand;
    if (stockStatus === 'low_stock') {
      query.$expr = { $lt: ['$stock', '$lowStockThreshold'] };
    } else if (stockStatus === 'out_of_stock') {
      query.stock = 0;
    } else if (stockStatus === 'in_stock') {
      query.$expr = { $gte: ['$stock', '$lowStockThreshold'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);

    res.json({ success: true, data: products, total, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.companyId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, company: req.companyId });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitProductCreated(io, req.companyId, product);
    }

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitProductUpdate(io, req.companyId, product);
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Emit WebSocket event
    const io = req.app.locals.io;
    if (io) {
      emitProductDeleted(io, req.companyId, product._id);
    }

    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/products/:id/adjust-stock
const adjustStock = async (req, res, next) => {
  try {
    const { quantity, type, reason } = req.body;
    const product = await Product.findOne({ _id: req.params.id, company: req.companyId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const previousStock = product.stock;
    let newStock;

    if (type === 'add') {
      newStock = previousStock + Math.abs(quantity);
    } else if (type === 'remove') {
      newStock = Math.max(0, previousStock - Math.abs(quantity));
    } else {
      newStock = quantity; // absolute set
    }

    product.stock = newStock;
    await product.save();

    await StockAdjustment.create({
      product: product._id,
      type,
      quantity: Math.abs(newStock - previousStock),
      previousStock,
      newStock,
      reason,
      createdBy: req.user._id,
      company: req.companyId,
    });

    // Emit WebSocket events
    const io = req.app.locals.io;
    if (io) {
      emitProductUpdate(io, req.companyId, product);

      // Check for low stock and emit alert
      if (newStock < product.lowStockThreshold) {
        const lowStockProducts = await Product.find({
          company: req.companyId,
          isActive: true,
          $expr: { $lt: ['$stock', '$lowStockThreshold'] },
        });
        emitLowStockAlert(io, req.companyId, lowStockProducts);
      }
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock
const getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      company: req.companyId,
      isActive: true,
      $expr: { $lt: ['$stock', '$lowStockThreshold'] },
    }).sort({ stock: 1 });
    res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, adjustStock, getLowStock };
