const Supplier = require('../models/Supplier');

// GET /api/suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { company: req.companyId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
};

// GET /api/suppliers/:id
const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, company: req.companyId });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

// POST /api/suppliers
const createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create({ ...req.body, company: req.companyId });
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

// PUT /api/suppliers/:id
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/suppliers/:id
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { isActive: false },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, message: 'Supplier removed.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
