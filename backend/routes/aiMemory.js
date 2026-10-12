const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/ai-memory
router.get('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const medicines = db.prepare('SELECT * FROM medicines WHERE user_id = ? ORDER BY id DESC').all(userId);
        const reports = db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY report_date DESC').all(userId);
        const vitals = db.prepare('SELECT * FROM vitals WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 5').all(userId);
        const timeline = db.prepare('SELECT * FROM timeline WHERE user_id = ? ORDER BY event_date DESC, id DESC LIMIT 10').all(userId);

        const priorityItems = [];

        if (user.blood_group) {
            priorityItems.push(`Blood Group: ${user.blood_group}`);
        }

        if (user.allergies && user.allergies.trim()) {
            priorityItems.push(`CRITICAL ALLERGY ALERT: ${user.allergies.trim()}`);
        }

        if (user.conditions && user.conditions.trim()) {
            priorityItems.push(`Known Chronic Conditions: ${user.conditions.trim()}`);
        }

        if (medicines.length > 0) {
            priorityItems.push(`${medicines.length} Active Prescription Medicine(s) Recorded`);
        }

        // Vitals evaluation
        if (user.blood_pressure) {
            const parts = user.blood_pressure.split('/');
            if (parts.length === 2) {
                const sys = parseInt(parts[0], 10);
                const dia = parseInt(parts[1], 10);
                if (sys >= 140 || dia >= 90) {
                    priorityItems.push(`Hypertension Notice: Latest BP is elevated (${user.blood_pressure} mmHg)`);
                }
            }
        }

        if (user.spo2 && parseInt(user.spo2, 10) < 95) {
            priorityItems.push(`Oxygen Warning: Latest SpO₂ reading is ${user.spo2}% (Below 95%)`);
        }

        if (priorityItems.length === 0) {
            priorityItems.push('No critical warnings or alerts recorded yet.');
        }

        const summaryText = `${user.name} has a structured MEDI-PASS profile containing ${medicines.length} medicine records, ${reports.length} diagnostic reports, and recent vital readings ready for clinical review.`;

        return res.json({
            success: true,
            data: {
                patientName: user.name,
                bloodGroup: user.blood_group || 'Not recorded',
                allergies: user.allergies || 'No allergies recorded',
                conditions: user.conditions || 'No conditions recorded',
                totalMedicines: medicines.length,
                totalReports: reports.length,
                totalVitals: vitals.length,
                priorityChecklist: priorityItems,
                healthSummary: summaryText,
                recentMedicines: medicines.slice(0, 5).map(m => ({
                    name: m.name,
                    dosage: m.dosage || 'Not specified',
                    timing: m.timing || 'Not specified'
                })),
                recentReports: reports.slice(0, 4).map(r => ({
                    name: r.name,
                    date: r.report_date,
                    type: r.report_type,
                    fileUrl: r.file_name ? `/uploads/${r.file_name}` : null
                })),
                recentVitals: vitals.slice(0, 3).map(v => ({
                    date: v.recorded_at,
                    bp: v.blood_pressure,
                    hr: v.heart_rate,
                    spo2: v.spo2
                })),
                timelinePreview: timeline.slice(0, 5).map(t => ({
                    icon: t.icon,
                    title: t.title,
                    description: t.description,
                    date: t.event_date
                }))
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to generate AI memory.', error: err.message });
    }
});

module.exports = router;
