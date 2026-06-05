const Warehouse = require('../models/Warehouse');

const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find({ company: req.companyId }).sort({ createdAt: 1 });
    res.json({ success: true, data: warehouses });
  } catch (err) { next(err); }
};

const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, company: req.companyId });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    res.json({ success: true, data: warehouse });
  } catch (err) { next(err); }
};

const createWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.create({ ...req.body, company: req.companyId });
    res.status(201).json({ success: true, data: warehouse });
  } catch (err) { next(err); }
};

const updateWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    res.json({ success: true, data: warehouse });
  } catch (err) { next(err); }
};

const deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    res.json({ success: true, message: 'Warehouse deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse };
