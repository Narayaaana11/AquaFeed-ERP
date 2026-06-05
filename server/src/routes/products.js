const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  adjustStock, getLowStock,
} = require('../controllers/productController');

router.use(protect);

router.get('/low-stock', getLowStock);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', roleGuard('Owner', 'Manager'), createProduct);
router.put('/:id', roleGuard('Owner', 'Manager'), updateProduct);
router.delete('/:id', roleGuard('Owner', 'Manager'), deleteProduct);
router.post('/:id/adjust-stock', roleGuard('Owner', 'Manager'), adjustStock);

module.exports = router;
