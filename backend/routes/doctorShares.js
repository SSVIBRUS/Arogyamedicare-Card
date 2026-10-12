const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

function calculateExpiry(duration) {
    const now = new Date();
    switch (duration) {
        case '15 Minutes':
            return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        case '1 Hour':
            return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        case '24 Hours':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        case '7 Days':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        default:
            return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
}

function generateCode() {
    return 'MP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// GET /api/doctor-shares
router.get('/', authenticate, (req, res) => {
    try {
        const shares = db.prepare(`
            SELECT id, doctor_name, access_code, access_type, duration, note, status, expires_at, created_at
            FROM doctor_shares
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(req.user.id);

        const mapped = shares.map(s => {
            const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
            const currentStatus = isExpired ? 'Expired' : s.status;
            return {
                id: s.id,
                doctor: s.doctor_name,
                doctorName: s.doctor_name,
                accessCode: s.access_code,
                shareCode: s.access_code,
                type: s.access_type,
                accessType: s.access_type,
                duration: s.duration,
                note: s.note,
                status: currentStatus,
                expiresAt: s.expires_at,
                date: new Date(s.created_at).toLocaleDateString(),
                createdAt: s.created_at
            };
        });

        return res.json({ success: true, count: mapped.length, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch doctor shares.', error: err.message });
    }
});

// POST /api/doctor-shares
router.post('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const { doctor, doctorName, type, accessType, duration, note } = req.body;

        const name = (doctor || doctorName || '').trim();
        if (!name) {
            return res.status(400).json({ success: false, message: 'Doctor or Clinic name is required.' });
        }

        const aType = (type || accessType || 'Emergency Summary').trim();
        const aDuration = (duration || '24 Hours').trim();
        const aNote = (note || '').trim();
        const code = generateCode();
        const expiresAt = calculateExpiry(aDuration);

        const insert = db.prepare(`
            INSERT INTO doctor_shares (user_id, doctor_name, access_code, access_type, duration, note, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(userId, name, code, aType, aDuration, aNote, expiresAt);

        // Timeline event
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            userId,
            '🩺',
            'Doctor Access Granted',
            `Temporary access granted to ${name} (${aType}, valid for ${aDuration}). Access code: ${code}.`
        );

        const newShare = db.prepare('SELECT * FROM doctor_shares WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: 'Doctor access created successfully.',
            data: {
                id: newShare.id,
                doctor: newShare.doctor_name,
                doctorName: newShare.doctor_name,
                accessCode: newShare.access_code,
                shareCode: newShare.access_code,
                type: newShare.access_type,
                duration: newShare.duration,
                note: newShare.note,
                status: newShare.status,
                expiresAt: newShare.expires_at,
                date: new Date(newShare.created_at).toLocaleDateString()
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to create doctor share.', error: err.message });
    }
});

// DELETE /api/doctor-shares/:id (Revoke)
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const share = db.prepare('SELECT id, doctor_name FROM doctor_shares WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!share) {
            return res.status(404).json({ success: false, message: 'Access record not found.' });
        }

        db.prepare('DELETE FROM doctor_shares WHERE id = ?').run(id);

        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            req.user.id,
            '🚫',
            'Doctor Access Revoked',
            `Access for ${share.doctor_name} has been revoked.`
        );

        return res.json({ success: true, message: 'Doctor access revoked successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to revoke access.', error: err.message });
    }
});

// GET /api/doctor-shares/access/:code (Public doctor portal access endpoint)
router.get('/access/:code', (req, res) => {
    try {
        const code = req.params.code.trim().toUpperCase();
        const share = db.prepare('SELECT * FROM doctor_shares WHERE UPPER(access_code) = ?').get(code);

        if (!share) {
            return res.status(404).json({ success: false, message: 'Invalid access code.' });
        }

        if (share.expires_at && new Date(share.expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: 'This access code has expired.' });
        }

        if (share.status === 'Revoked') {
            return res.status(403).json({ success: false, message: 'This access grant was revoked by the patient.' });
        }

        const patient = db.prepare(`
            SELECT id, name, age, dob, gender, blood_group, height, weight,
                   blood_pressure, heart_rate, spo2, blood_sugar,
                   emergency_name, emergency_phone, emergency_relation,
                   conditions, allergies, current_medicines, abha, language
            FROM users WHERE id = ?
        `).get(share.user_id);

        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient profile not found.' });
        }

        const responseData = {
            accessInfo: {
                doctorName: share.doctor_name,
                accessType: share.access_type,
                expiresAt: share.expires_at,
                notes: share.note
            },
            patient: {
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                bloodGroup: patient.blood_group,
                abha: patient.abha,
                emergencyContact: `${patient.emergency_name || ''} (${patient.emergency_phone || ''})`
            }
        };

        // Include data based on access type
        if (share.access_type === 'Emergency Summary' || share.access_type === 'Full Medical Memory') {
            responseData.allergies = patient.allergies;
            responseData.conditions = patient.conditions;
            responseData.vitals = {
                bloodPressure: patient.blood_pressure,
                heartRate: patient.heart_rate,
                spo2: patient.spo2,
                bloodSugar: patient.blood_sugar
            };
        }

        if (share.access_type === 'Medicines & Allergies' || share.access_type === 'Full Medical Memory') {
            const meds = db.prepare('SELECT name, dosage, frequency, timing, notes FROM medicines WHERE user_id = ? AND is_active = 1').all(patient.id);
            responseData.medicines = meds;
            responseData.allergies = patient.allergies;
        }

        if (share.access_type === 'Reports Only' || share.access_type === 'Full Medical Memory') {
            const reports = db.prepare('SELECT name, report_date, report_type, hospital, file_name FROM reports WHERE user_id = ?').all(patient.id);
            responseData.reports = reports.map(r => ({
                name: r.name,
                date: r.report_date,
                type: r.report_type,
                hospital: r.hospital,
                fileUrl: r.file_name ? `/uploads/${r.file_name}` : null
            }));
        }

        return res.json({ success: true, data: responseData });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error retrieving doctor access.', error: err.message });
    }
});

module.exports = router;
