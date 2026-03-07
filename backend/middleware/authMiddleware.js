const jwt = require('jsonwebtoken');
const JWT_SECRET = 'examhall_super_secret_key_2026';

// Verifies if the user is logged in
exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    // Expecting token format: "Bearer <token>"
    const actualToken = token.split(' ')[1];

    jwt.verify(actualToken, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        req.user = decoded; // Attach the user info to the request
        next();
    });
};

// Verifies if the logged-in user is an Admin
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Require Admin Role' });
    }
    next();
};