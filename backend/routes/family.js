const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/family
router.get('/', authenticate, (req, res) => {
    try {
        const family = db.prepare(`
            SELECT id, name, relation, blood_group, allergies, conditions, notes, created_at
            FROM family_members
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(req.user.id);

        const mapped = family.map(f => ({
            id: f.id,
            name: f.name,
            relation: f.relation,
            bloodGroup: f.blood_group,
            blood: f.blood_group,
            allergies: f.allergies,
            conditions: f.conditions,
            notes: f.notes,
            createdAt: f.created_at
        }));

        return res.json({ success: true, count: mapped.length, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch family members.', error: err.message });
    }
});

// POST /api/family
router.post('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const { name, relation, bloodGroup, blood, allergies, conditions, notes } = req.body;

        const fName = (name || '').trim();
        const fRel = (relation || '').trim();

        if (!fName || !fRel) {
            return res.status(400).json({ success: false, message: 'Name and relationship are required.' });
        }

        const fBlood = (bloodGroup || blood || '').trim();
        const fAllergies = (allergies || '').trim();
        const fConditions = (conditions || '').trim();
        const fNotes = (notes || '').trim();

        const insert = db.prepare(`
            INSERT INTO family_members (user_id, name, relation, blood_group, allergies, conditions, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            userId,
            fName,
            fRel,
            fBlood || null,
            fAllergies || null,
            fConditions || null,
            fNotes || null
        );

        // Timeline event
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            userId,
            '👨‍👩‍👧',
            'Family Profile Added',
            `${fName} (${fRel}) added to family health circle.`
        );

        const newMember = db.prepare('SELECT * FROM family_members WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: 'Family member profile added successfully.',
            data: {
                id: newMember.id,
                name: newMember.name,
                relation: newMember.relation,
                bloodGroup: newMember.blood_group,
                allergies: newMember.allergies,
                conditions: newMember.conditions,
                notes: newMember.notes
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to add family member.', error: err.message });
    }
});

// DELETE /api/family/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const member = db.prepare('SELECT id, name FROM family_members WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Family member not found.' });
        }

        db.prepare('DELETE FROM family_members WHERE id = ?').run(id);

        return res.json({ success: true, message: 'Family member profile deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete family member.', error: err.message });
    }
});

module.exports = router;
