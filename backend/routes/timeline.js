const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/timeline
router.get('/', authenticate, (req, res) => {
    try {
        const events = db.prepare(`
            SELECT id, icon, title, description, event_date, created_at
            FROM timeline
            WHERE user_id = ?
            ORDER BY event_date DESC, id DESC
        `).all(req.user.id);

        const mapped = events.map(e => ({
            id: e.id,
            icon: e.icon || '📌',
            title: e.title,
            description: e.description,
            date: e.event_date || new Date(e.created_at).toLocaleDateString(),
            timestamp: new Date(e.created_at).getTime()
        }));

        return res.json({ success: true, count: mapped.length, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch timeline.', error: err.message });
    }
});

// POST /api/timeline
router.post('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const { icon, title, description, date, eventDate } = req.body;

        const tTitle = (title || '').trim();
        if (!tTitle) {
            return res.status(400).json({ success: false, message: 'Event title is required.' });
        }

        const tIcon = (icon || '📌').trim();
        const tDesc = (description || '').trim();
        const tDate = (eventDate || date || new Date().toISOString().split('T')[0]).trim();

        const insert = db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = insert.run(userId, tIcon, tTitle, tDesc || null, tDate);

        const newEvent = db.prepare('SELECT * FROM timeline WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: 'Timeline event recorded.',
            data: {
                id: newEvent.id,
                icon: newEvent.icon,
                title: newEvent.title,
                description: newEvent.description,
                date: newEvent.event_date,
                timestamp: new Date(newEvent.created_at).getTime()
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to add timeline event.', error: err.message });
    }
});

// DELETE /api/timeline/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const event = db.prepare('SELECT id FROM timeline WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Timeline event not found.' });
        }

        db.prepare('DELETE FROM timeline WHERE id = ?').run(id);

        return res.json({ success: true, message: 'Timeline event deleted.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete event.', error: err.message });
    }
});

module.exports = router;
