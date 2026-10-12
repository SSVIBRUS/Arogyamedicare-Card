const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/vitals
router.get('/', authenticate, (req, res) => {
    try {
        const vitals = db.prepare(`
            SELECT id, blood_pressure, heart_rate, spo2, blood_sugar, weight, temperature, notes, recorded_at
            FROM vitals
            WHERE user_id = ?
            ORDER BY recorded_at DESC, id DESC
        `).all(req.user.id);

        const mapped = vitals.map(v => ({
            id: v.id,
            date: v.recorded_at,
            bloodPressure: v.blood_pressure,
            heartRate: v.heart_rate,
            spo2: v.spo2,
            bloodSugar: v.blood_sugar,
            weight: v.weight,
            temperature: v.temperature,
            notes: v.notes
        }));

        return res.json({ success: true, count: mapped.length, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch vitals.', error: err.message });
    }
});

// POST /api/vitals
router.post('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const { bloodPressure, heartRate, spo2, bloodSugar, weight, temperature, notes } = req.body;

        const insert = db.prepare(`
            INSERT INTO vitals (user_id, blood_pressure, heart_rate, spo2, blood_sugar, weight, temperature, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            userId,
            bloodPressure ? bloodPressure.trim() : null,
            heartRate || null,
            spo2 || null,
            bloodSugar ? bloodSugar.trim() : null,
            weight || null,
            temperature || null,
            notes ? notes.trim() : null
        );

        // Also update latest vitals on patient record
        db.prepare(`
            UPDATE users SET
                blood_pressure = COALESCE(?, blood_pressure),
                heart_rate = COALESCE(?, heart_rate),
                spo2 = COALESCE(?, spo2),
                blood_sugar = COALESCE(?, blood_sugar),
                weight = COALESCE(?, weight),
                updated_at = datetime('now')
            WHERE id = ?
        `).run(
            bloodPressure || null,
            heartRate || null,
            spo2 || null,
            bloodSugar || null,
            weight || null,
            userId
        );

        // Log to timeline
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            userId,
            '❤️',
            'Health Vitals Recorded',
            `BP: ${bloodPressure || '--'}, HR: ${heartRate || '--'} BPM, SpO2: ${spo2 ? spo2 + '%' : '--'}`
        );

        const newVital = db.prepare('SELECT * FROM vitals WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: 'Vitals recorded successfully.',
            data: {
                id: newVital.id,
                date: newVital.recorded_at,
                bloodPressure: newVital.blood_pressure,
                heartRate: newVital.heart_rate,
                spo2: newVital.spo2,
                bloodSugar: newVital.blood_sugar,
                weight: newVital.weight,
                temperature: newVital.temperature,
                notes: newVital.notes
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to record vitals.', error: err.message });
    }
});

// DELETE /api/vitals/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const check = db.prepare('SELECT id FROM vitals WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!check) {
            return res.status(404).json({ success: false, message: 'Vital reading not found.' });
        }

        db.prepare('DELETE FROM vitals WHERE id = ?').run(id);
        return res.json({ success: true, message: 'Vital reading deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete vital.', error: err.message });
    }
});

module.exports = router;
