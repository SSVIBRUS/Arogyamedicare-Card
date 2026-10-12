const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

function buildEmergencyPayload(user, medicines = []) {
    const medList = medicines.map(m => ({
        name: m.name,
        dosage: m.dosage,
        timing: m.timing
    }));

    const medString = medList.length
        ? medList.slice(0, 4).map(m => [m.name, m.dosage].filter(Boolean).join(' ')).join(', ') + (medList.length > 4 ? ' + more' : '')
        : (user.current_medicines || 'None recorded');

    return {
        id: user.id,
        name: user.name,
        bloodGroup: user.blood_group || user.blood || '--',
        age: user.age || '--',
        gender: user.gender || '--',
        allergies: user.allergies && user.allergies.trim() ? user.allergies : 'None recorded',
        conditions: user.conditions && user.conditions.trim() ? user.conditions : 'None recorded',
        currentMedicines: medString,
        medicines: medList,
        emergencyContactName: user.emergency_name || '--',
        emergencyContactPhone: user.emergency_phone || '--',
        emergencyContactRelation: user.emergency_relation || '',
        emergencyContact: [user.emergency_name, user.emergency_phone].filter(Boolean).join(' • ') || '--',
        vitals: {
            bloodPressure: user.blood_pressure || '--',
            heartRate: user.heart_rate || '--',
            spo2: user.spo2 ? `${user.spo2}%` : '--',
            bloodSugar: user.blood_sugar || '--'
        },
        abha: user.abha || '--',
        language: user.language || 'English',
        qrData: encodeURIComponent(
            `MEDI-PASS Emergency Profile\n` +
            `Name: ${user.name || '--'}\n` +
            `Blood Group: ${user.blood_group || '--'}\n` +
            `Allergies: ${user.allergies || 'None recorded'}\n` +
            `Conditions: ${user.conditions || 'None recorded'}\n` +
            `Medicines: ${medString}\n` +
            `Emergency Contact: ${[user.emergency_name, user.emergency_phone].filter(Boolean).join(' ') || '--'}`
        )
    };
}

// GET /api/emergency/me
router.get('/me', authenticate, (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        const medicines = db.prepare('SELECT name, dosage, timing FROM medicines WHERE user_id = ? AND is_active = 1').all(req.user.id);

        return res.json({
            success: true,
            data: buildEmergencyPayload(user, medicines)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch emergency data.', error: err.message });
    }
});

// GET /api/emergency/:userId (Public paramedic emergency scan)
router.get('/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid patient ID.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Patient emergency record not found.' });
        }

        const medicines = db.prepare('SELECT name, dosage, timing FROM medicines WHERE user_id = ? AND is_active = 1').all(userId);

        return res.json({
            success: true,
            data: buildEmergencyPayload(user, medicines)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve emergency profile.', error: err.message });
    }
});

module.exports = router;
