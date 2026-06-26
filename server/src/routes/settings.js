const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getCompany, updateCompany, getUsers, createUser, updateUser, updateProfile, loadDemoData, clearCompanyData, syncTallyData
} = require('../controllers/settingsController');

router.use(protect);
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
