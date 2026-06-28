const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, companyName, phone, gstNumber, address } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Handle logo upload - convert to Base64
    let logoUrl = null;
    if (req.file) {
      const base64Logo = req.file.buffer.toString('base64');
      logoUrl = `data:${req.file.mimetype};base64,${base64Logo}`;
    }

    // Create company first
    const company = await Company.create({
      name: companyName || 'My Company',
      ownerName: name,
      phone,
      gstNumber,
      address,
      email,
      logoUrl,
    });

    // Create owner user
    const user = await User.create({
      name,
      email,
      password,
      role: 'Owner',
      company: company._id,
      phone,
      accessibleCompanies: [company._id],
    });

    const token = signToken(user._id);

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: {
        _id: company._id,
        name: company.name,
        gstNumber: company.gstNumber,
        gstRate: company.gstRate,
        logoUrl: company.logoUrl,
      },
    };

    res.status(201).json({ success: true, token, user: userData });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password').populate('company');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: {
        _id: user.company._id,
        name: user.company.name,
        gstNumber: user.company.gstNumber,
        gstRate: user.company.gstRate,
        invoicePrefix: user.company.invoicePrefix,
        address: user.company.address,
        phone: user.company.phone,
        logoUrl: user.company.logoUrl,
      },
    };

    res.json({ success: true, token, user: userData });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('company');
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
    };
    res.json({ success: true, user: userData });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, changePassword };

