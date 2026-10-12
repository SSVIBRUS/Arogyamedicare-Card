const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'medipass-super-secret-health-jwt-key-2026';

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const stmt = db.prepare('SELECT id, name, email, age, dob, gender, mobile, blood_group, height, weight, blood_pressure, heart_rate, spo2, blood_sugar, emergency_name, emergency_phone, emergency_relation, conditions, allergies, current_medicines, abha, language, created_at FROM users WHERE id = ?');
        const user = stmt.get(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found or account removed.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.', error: err.message });
    }
}

// Optional auth: sets req.user if valid token provided, but doesn't reject if not
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const stmt = db.prepare('SELECT id, name, email, age, dob, gender, mobile, blood_group, height, weight, blood_pressure, heart_rate, spo2, blood_sugar, emergency_name, emergency_phone, emergency_relation, conditions, allergies, current_medicines, abha, language, created_at FROM users WHERE id = ?');
            const user = stmt.get(decoded.id);
            if (user) req.user = user;
        } catch (_) {
            // ignore
        }
    }
    next();
}

module.exports = {
    authenticate,
    optionalAuth,
    JWT_SECRET
};
