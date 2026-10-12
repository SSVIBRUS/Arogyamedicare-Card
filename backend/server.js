require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import database (initializes automatically)
const db = require('./config/db');

// Import route modules
const authRoutes = require('./routes/auth');
const vitalsRoutes = require('./routes/vitals');
const medicinesRoutes = require('./routes/medicines');
const reportsRoutes = require('./routes/reports');
const doctorSharesRoutes = require('./routes/doctorShares');
const familyRoutes = require('./routes/family');
const timelineRoutes = require('./routes/timeline');
const emergencyRoutes = require('./routes/emergency');
const aiMemoryRoutes = require('./routes/aiMemory');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for any client / live server / local dev
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsers & logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static folder for uploaded medical report attachments
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files from root directory
const frontendDir = path.join(__dirname, '..');
app.use(express.static(frontendDir));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/doctor-shares', doctorSharesRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ai-memory', aiMemoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        appName: 'MEDI-PASS Healthcare Backend',
        timestamp: new Date().toISOString()
    });
});

// Fallback to static files or index.html for frontend routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'API route not found' });
    }
    const requestedFile = path.join(frontendDir, req.path);
    if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
        return res.sendFile(requestedFile);
    }
    res.sendFile(path.join(frontendDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🩺 MEDI-PASS Backend Server running on port ${PORT}`);
    console.log(`🌐 Local Web Portal: http://localhost:${PORT}`);
    console.log(`🚀 API Base URL:      http://localhost:${PORT}/api`);
    console.log(`===============================================`);
});

module.exports = app;
