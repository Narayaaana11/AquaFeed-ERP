const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password').populate('company');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    req.user = user;
    req.companyId = user.company._id; // always default to the user's own company

    // Allow context-switching only to companies the user is explicitly allowed to access
    if (req.query.companyId && req.query.companyId !== String(user.company._id)) {
      const requestedId = req.query.companyId;
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(requestedId);
      const isAllowed = isValidObjectId &&
        Array.isArray(user.accessibleCompanies) &&
        user.accessibleCompanies.some(id => String(id) === requestedId);

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this company.',
        });
      }
      req.companyId = requestedId;
    }

    next();

  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

module.exports = { protect };
