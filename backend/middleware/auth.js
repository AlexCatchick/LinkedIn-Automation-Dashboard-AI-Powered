const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: 'Access denied. No token provided.'
            });
        }

        // Extract token from "Bearer TOKEN"
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        if (!token) {
            return res.status(401).json({
                error: 'Access denied. Invalid token format.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user info to request
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Access denied. Invalid token.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access denied. Token expired.'
            });
        }

        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication failed.'
        });
    }
};

module.exports = auth;
