const Batch = require('../models/Batch');

// @desc    Get all batches for a company
// @route   GET /api/batches
// @access  Private
exports.getBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find({ company: req.user.companyId })
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single batch
// @route   GET /api/batches/:id
// @access  Private
exports.getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({ 
      _id: req.params.id, 
      company: req.user.companyId 
    })
    .populate('product', 'name sku')
    .populate('warehouse', 'name code');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (err) {
    next(err);
  }
};
