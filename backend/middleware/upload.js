const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMime = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/jpg',
        'text/plain'
    ];
    if (allowedMime.includes(file.mimetype) || file.originalname.match(/\.(pdf|jpe?g|png|webp|txt)$/i)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, JPG, PNG, WEBP and TXT files are accepted for medical reports.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: fileFilter
});

module.exports = upload;
