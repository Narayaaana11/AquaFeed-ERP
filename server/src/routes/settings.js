const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Company = require('../models/Company');

// Get all companies (for global filter)
router.get('/companies', protect, async (req, res) => {
  try {
    const companies = await Company.find().select('name _id sortOrder').sort('sortOrder name');
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch companies' });
  }
});

const { roleGuard } = require('../middleware/roleGuard');
const {
  getCompany, updateCompany, getUsers, createUser, updateUser, updateProfile, loadDemoData, clearCompanyData, syncTallyData, updateCompanyOrder
} = require('../controllers/settingsController');

router.use(protect);
router.put('/companies/order', roleGuard('Owner'), updateCompanyOrder);
router.get('/company', getCompany);
router.put('/company', roleGuard('Owner'), updateCompany);
router.post('/load-demo', roleGuard('Owner'), loadDemoData);
router.post('/clear-data', roleGuard('Owner'), clearCompanyData);
router.post('/sync-tally', roleGuard('Owner'), syncTallyData);
router.get('/users', getUsers);
router.post('/users', roleGuard('Owner', 'Manager'), createUser);
router.put('/users/:id', roleGuard('Owner', 'Manager'), updateUser);
router.put('/profile', updateProfile);

module.exports = router;
