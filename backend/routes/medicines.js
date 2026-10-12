const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/medicines
router.get('/', authenticate, (req, res) => {
    try {
        const medicines = db.prepare(`
            SELECT id, name, dosage, frequency, timing, start_date, end_date, notes, is_active, created_at
            FROM medicines
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(req.user.id);

        const mapped = medicines.map(m => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            timing: m.timing,
            startDate: m.start_date,
            endDate: m.end_date,
            notes: m.notes,
            isActive: Boolean(m.is_active),
            createdAt: m.created_at
        }));

        return res.json({ success: true, count: mapped.length, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch medicines.', error: err.message });
    }
});

// POST /api/medicines
router.post('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const { name, medicineName, dosage, dose, frequency, timing, startDate, endDate, notes } = req.body;

        const medName = (name || medicineName || '').trim();
        if (!medName) {
            return res.status(400).json({ success: false, message: 'Medicine name is required.' });
        }

        const medDosage = (dosage || dose || '').trim();
        const medTiming = (timing || '').trim();
        const medFreq = (frequency || '').trim();
        const medNotes = (notes || '').trim();

        const insert = db.prepare(`
            INSERT INTO medicines (user_id, name, dosage, frequency, timing, start_date, end_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            userId,
            medName,
            medDosage || null,
            medFreq || null,
            medTiming || null,
            startDate || null,
            endDate || null,
            medNotes || null
        );

        // Add to timeline
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            userId,
            '💊',
            'Medicine Added',
            `${medName} (${medDosage || 'Dosage not set'}) added to medication schedule.`
        );

        const newMed = db.prepare('SELECT * FROM medicines WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: 'Medicine added successfully.',
            data: {
                id: newMed.id,
                name: newMed.name,
                dosage: newMed.dosage,
                frequency: newMed.frequency,
                timing: newMed.timing,
                startDate: newMed.start_date,
                endDate: newMed.end_date,
                notes: newMed.notes,
                isActive: Boolean(newMed.is_active),
                createdAt: newMed.created_at
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to add medicine.', error: err.message });
    }
});

// PUT /api/medicines/:id
router.put('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const check = db.prepare('SELECT id FROM medicines WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!check) {
            return res.status(404).json({ success: false, message: 'Medicine not found.' });
        }

        const { name, dosage, frequency, timing, startDate, endDate, notes, isActive } = req.body;

        db.prepare(`
            UPDATE medicines SET
                name = COALESCE(?, name),
                dosage = COALESCE(?, dosage),
                frequency = COALESCE(?, frequency),
                timing = COALESCE(?, timing),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                notes = COALESCE(?, notes),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `).run(
            name ? name.trim() : null,
            dosage !== undefined ? dosage : null,
            frequency !== undefined ? frequency : null,
            timing !== undefined ? timing : null,
            startDate !== undefined ? startDate : null,
            endDate !== undefined ? endDate : null,
            notes !== undefined ? notes : null,
            isActive !== undefined ? (isActive ? 1 : 0) : null,
            id
        );

        const updated = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);

        return res.json({
            success: true,
            message: 'Medicine updated successfully.',
            data: {
                id: updated.id,
                name: updated.name,
                dosage: updated.dosage,
                frequency: updated.frequency,
                timing: updated.timing,
                startDate: updated.start_date,
                endDate: updated.end_date,
                notes: updated.notes,
                isActive: Boolean(updated.is_active)
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update medicine.', error: err.message });
    }
});

// DELETE /api/medicines/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const current = db.prepare('SELECT id, name FROM medicines WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!current) {
            return res.status(404).json({ success: false, message: 'Medicine not found.' });
        }

        db.prepare('DELETE FROM medicines WHERE id = ?').run(id);

        // Timeline event
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            req.user.id,
            '🗑️',
            'Medicine Removed',
            `${current.name} was removed from the active prescription list.`
        );

        return res.json({ success: true, message: 'Medicine removed successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete medicine.', error: err.message });
    }
});

module.exports = router;
