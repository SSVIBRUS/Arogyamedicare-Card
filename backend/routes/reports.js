const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/reports
router.get('/', authenticate, (req, res) => {
    try {
        const reports = db.prepare(`
            SELECT id, name, report_date, report_type, hospital, file_path, file_name, file_size, mime_type, notes, created_at
            FROM reports
            WHERE user_id = ?
            ORDER BY report_date DESC, id DESC
        `).all(req.user.id);

        const mapped = reports.map(r => ({
            id: r.id,
            name: r.name,
            date: r.report_date,
            type: r.report_type,
            hospital: r.hospital,
            fileName: r.file_name,
            filePath: r.file_path,
            fileUrl: r.file_name ? `/uploads/${r.file_name}` : null,
            fileSize: r.file_size,
            notes: r.notes,
            createdAt: r.created_at
        }));

        return res.json({ success: true, count: mapped.length, data: mapped });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch medical reports.', error: err.message });
    }
});

// POST /api/reports (handles multipart upload or JSON)
router.post('/', authenticate, upload.single('file'), (req, res) => {
    try {
        const userId = req.user.id;
        const { name, reportName, date, reportDate, type, reportType, hospital, notes } = req.body;

        const docName = (name || reportName || (req.file ? req.file.originalname : 'Medical Report')).trim();
        const docDate = (date || reportDate || new Date().toISOString().split('T')[0]).trim();
        const docType = (type || reportType || 'Medical Report').trim();
        const docHospital = (hospital || '').trim();
        const docNotes = (notes || '').trim();

        const fileName = req.file ? req.file.filename : null;
        const filePath = req.file ? req.file.path : null;
        const fileSize = req.file ? req.file.size : null;
        const mimeType = req.file ? req.file.mimetype : null;

        const insert = db.prepare(`
            INSERT INTO reports (user_id, name, report_date, report_type, hospital, file_path, file_name, file_size, mime_type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
            userId,
            docName,
            docDate,
            docType,
            docHospital || null,
            filePath,
            fileName,
            fileSize,
            mimeType,
            docNotes || null
        );

        // Timeline event
        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            userId,
            '📄',
            'Medical Report Uploaded',
            `${docName} (${docType})${docHospital ? ' from ' + docHospital : ''} stored securely.`,
            docDate
        );

        const newReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);

        return res.status(201).json({
            success: true,
            message: 'Medical report saved successfully.',
            data: {
                id: newReport.id,
                name: newReport.name,
                date: newReport.report_date,
                type: newReport.report_type,
                hospital: newReport.hospital,
                fileName: newReport.file_name,
                fileUrl: newReport.file_name ? `/uploads/${newReport.file_name}` : null,
                notes: newReport.notes
            }
        });
    } catch (err) {
        console.error('Error saving report:', err);
        return res.status(500).json({ success: false, message: 'Failed to upload report.', error: err.message });
    }
});

// DELETE /api/reports/:id
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const report = db.prepare('SELECT id, name, file_path, file_name FROM reports WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        // Delete file from disk if present
        if (report.file_path && fs.existsSync(report.file_path)) {
            try {
                fs.unlinkSync(report.file_path);
            } catch (_) {
                // ignore unlink errors
            }
        }

        db.prepare('DELETE FROM reports WHERE id = ?').run(id);

        db.prepare(`
            INSERT INTO timeline (user_id, icon, title, description, event_date)
            VALUES (?, ?, ?, ?, date('now'))
        `).run(
            req.user.id,
            '🗑️',
            'Medical Report Removed',
            `${report.name} was removed from records.`
        );

        return res.json({ success: true, message: 'Medical report deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete report.', error: err.message });
    }
});

module.exports = router;
