const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

module.exports = (upload) => {
    router.post('/register', upload.single('logo'), register);
    router.post('/login', login);
    router.get('/me', protect, getMe);
    router.put('/change-password', protect, changePassword);

    return router;
};
