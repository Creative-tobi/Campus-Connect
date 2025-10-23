// const jwt = require("jsonwebtoken");

// const authmiddleware = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
// };

// module.exports = authmiddleware;
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const dotenv = require('dotenv');

dotenv.config();

const authenticate = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token and attach to request
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ error: 'Token is not valid' });
            }

            if (!req.user.isActive) {
                return res.status(403).json({ error: 'User account is deactivated' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized - No user found" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. ${req.user.role} role not authorized for this action.`
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
