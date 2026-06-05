/**
 * Middleware to attach io instance to requests
 * This allows all route handlers to easily access the Socket.IO instance
 */
const attachIO = (io) => {
    return (req, res, next) => {
        req.io = io;
        next();
    };
};

module.exports = { attachIO };
