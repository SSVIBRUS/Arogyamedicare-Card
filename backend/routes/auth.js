const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

function sanitizeUser(row) {
    if (!row) return null;
    const { password_hash, ...safeUser } = row;
    return {
        ...safeUser,
        blood: safeUser.blood_group,
        emergencyContactName: safeUser.emergency_name,
        emergencyContactPhone: safeUser.emergency_phone,
        emergencyContactRelation: safeUser.emergency_relation,
        bloodPressure: safeUser.blood_pressure,
        heartRate: safeUser.heart_rate,
        bloodSugar: safeUser.blood_sugar,
        currentMedicines: safeUser.current_medicines
    };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            dob,
            age,
            gender,
            mobile,
            blood,
            bloodGroup,
            height,
            weight,
            bloodPressure,
            heartRate,
            spo2,
            bloodSugar,
            emergencyName,
            emergencyPhone,
            emergencyRelation,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelation,
            conditions,
            allergies,
            currentMedicines,
            abha,
            language
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
        if (existing) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
        }

        // Use password provided or fallback to a default secure token if registered without password
        const plainPassword = password && password.trim() ? password.trim() : 'medipass@123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);

        const chosenBlood = (bloodGroup || blood || '').trim();
        const chosenEmergName = (emergencyContactName || emergencyName || '').trim();
        const chosenEmergPhone = (emergencyContactPhone || emergencyPhone || '').trim();
        const chosenEmergRel = (emergencyContactRelation || emergencyRelation || '').trim();

        const insertStmt = db.prepare(`
            INSERT INTO users (
                name, email, password_hash, dob, age, gender, mobile,
                blood_group, height, weight, blood_pressure, heart_rate, spo2, blood_sugar,
                emergency_name, emergency_phone, emergency_relation,
                conditions, allergies, current_medicines, abha, language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertStmt.run(
            name.trim(),
            normalizedEmail,
            passwordHash,
            dob || null,
            age ? parseInt(age, 10) : null,
            gender || null,
            mobile ? mobile.trim() : null,
            chosenBlood || null,
            height || null,
            weight || null,
            bloodPressure ? bloodPressure.trim() : null,
            heartRate || null,
            spo2 || null,
            bloodSugar ? bloodSugar.trim() : null,
            chosenEmergName || null,
            chosenEmergPhone || null,
            chosenEmergRel || null,
            conditions ? conditions.trim() : null,
            allergies ? allergies.trim() : null,
            currentMedicines ? currentMedicines.trim() : null,
            abha ? abha.trim() : null,
            language || 'English'
        );

        const newUserId = Number(result.lastInsertRowid);

        // Record initial vital reading if any vital was supplied
        if (bloodPressure || heartRate || spo2 || bloodSugar || weight) {
            db.prepare(`
                INSERT INTO vitals (user_id, blood_pressure, heart_rate, spo2, blood_sugar, weight, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                newUserId,
                bloodPressure || null,
                heartRate || null,
                spo2 || null,
                bloodSugar || null,
                weight || null,
                'Initial registration baseline vitals'
            );
        }

        // Add initial timeline event
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            newUserId,
            '📋',
            'MEDI-PASS Profile Created',
            `Official medical profile initialized for ${name.trim()}.`
        );

        // Generate JWT
        const token = jwt.sign({ id: newUserId, email: normalizedEmail }, JWT_SECRET, { expiresIn: '30d' });

        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);

        return res.status(201).json({
            success: true,
            message: 'Patient profile registered successfully.',
            token,
            user: sanitizeUser(newUser)
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Server error during registration.', error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

        if (!user) {
            return res.status(404).json({ success: false, message: 'No MEDI-PASS account found with this email. Please create a profile first.' });
        }

        if (password) {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
            }
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        return res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: sanitizeUser(user)
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Server error during login.', error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({
        success: true,
        user: sanitizeUser(user)
    });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            dob,
            age,
            gender,
            mobile,
            blood,
            bloodGroup,
            height,
            weight,
            bloodPressure,
            heartRate,
            spo2,
            bloodSugar,
            emergencyName,
            emergencyPhone,
            emergencyRelation,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelation,
            conditions,
            allergies,
            currentMedicines,
            abha,
            language
        } = req.body;

        const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        const newName = name !== undefined ? name.trim() : current.name;
        const newBlood = (bloodGroup || blood) !== undefined ? (bloodGroup || blood).trim() : current.blood_group;
        const newBP = bloodPressure !== undefined ? bloodPressure.trim() : current.blood_pressure;
        const newHR = heartRate !== undefined ? heartRate : current.heart_rate;
        const newSpO2 = spo2 !== undefined ? spo2 : current.spo2;
        const newSugar = bloodSugar !== undefined ? bloodSugar.trim() : current.blood_sugar;
        const newWeight = weight !== undefined ? weight : current.weight;
        const newHeight = height !== undefined ? height : current.height;
        const newAllergies = allergies !== undefined ? allergies.trim() : current.allergies;
        const newConditions = conditions !== undefined ? conditions.trim() : current.conditions;
        const newMedicines = currentMedicines !== undefined ? currentMedicines.trim() : current.current_medicines;
        const newEmergName = (emergencyContactName || emergencyName) !== undefined ? (emergencyContactName || emergencyName).trim() : current.emergency_name;
        const newEmergPhone = (emergencyContactPhone || emergencyPhone) !== undefined ? (emergencyContactPhone || emergencyPhone).trim() : current.emergency_phone;
        const newEmergRel = (emergencyContactRelation || emergencyRelation) !== undefined ? (emergencyContactRelation || emergencyRelation).trim() : current.emergency_relation;
        const newAbha = abha !== undefined ? abha.trim() : current.abha;
        const newLang = language !== undefined ? language : current.language;
        const newAge = age !== undefined ? parseInt(age, 10) : current.age;
        const newDob = dob !== undefined ? dob : current.dob;
        const newMobile = mobile !== undefined ? mobile.trim() : current.mobile;

        db.prepare(`
            UPDATE users SET
                name = ?, dob = ?, age = ?, gender = ?, mobile = ?,
                blood_group = ?, height = ?, weight = ?,
                blood_pressure = ?, heart_rate = ?, spo2 = ?, blood_sugar = ?,
                emergency_name = ?, emergency_phone = ?, emergency_relation = ?,
                conditions = ?, allergies = ?, current_medicines = ?,
                abha = ?, language = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(
            newName, newDob, newAge, gender || current.gender, newMobile,
            newBlood, newHeight, newWeight,
            newBP, newHR, newSpO2, newSugar,
            newEmergName, newEmergPhone, newEmergRel,
            newConditions, newAllergies, newMedicines,
            newAbha, newLang, userId
        );

        // Check if vitals changed - log new vital reading
        const vitalsChanged = (newBP !== current.blood_pressure) ||
                              (newHR !== current.heart_rate) ||
                              (newSpO2 !== current.spo2) ||
                              (newSugar !== current.blood_sugar) ||
                              (newWeight !== current.weight);

        if (vitalsChanged && (newBP || newHR || newSpO2 || newSugar)) {
            db.prepare(`
                INSERT INTO vitals (user_id, blood_pressure, heart_rate, spo2, blood_sugar, weight, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(userId, newBP, newHR, newSpO2, newSugar, newWeight, 'Updated profile vitals');

            db.prepare(`
                INSERT INTO timeline (user_id, icon, title, description, event_date)
                VALUES (?, ?, ?, ?, date('now'))
            `).run(userId, '❤️', 'Vitals Updated', `Updated readings: BP ${newBP || '--'}, HR ${newHR || '--'} BPM, SpO2 ${newSpO2 ? newSpO2 + '%' : '--'}`);
        }

        // Check if allergy changed
        if (newAllergies !== current.allergies) {
            db.prepare(`
                INSERT INTO timeline (user_id, icon, title, description, event_date)
                VALUES (?, ?, ?, ?, date('now'))
            `).run(userId, '⚠️', 'Allergy Record Updated', newAllergies || 'Allergy information cleared/updated.');
        }

        const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        return res.json({
            success: true,
            message: 'Medical profile updated successfully.',
            user: sanitizeUser(updated)
        });
    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ success: false, message: 'Server error updating profile.', error: err.message });
    }
});

module.exports = router;
