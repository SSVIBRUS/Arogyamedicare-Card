const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'medicare.sqlite');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            dob TEXT,
            age INTEGER,
            gender TEXT,
            mobile TEXT,
            blood_group TEXT,
            height TEXT,
            weight TEXT,
            blood_pressure TEXT,
            heart_rate TEXT,
            spo2 TEXT,
            blood_sugar TEXT,
            emergency_name TEXT,
            emergency_phone TEXT,
            emergency_relation TEXT,
            conditions TEXT,
            allergies TEXT,
            current_medicines TEXT,
            abha TEXT,
            language TEXT DEFAULT 'English',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            blood_pressure TEXT,
            heart_rate TEXT,
            spo2 TEXT,
            blood_sugar TEXT,
            weight TEXT,
            temperature TEXT,
            notes TEXT,
            recorded_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            dosage TEXT,
            frequency TEXT,
            timing TEXT,
            start_date TEXT,
            end_date TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            report_date TEXT,
            report_type TEXT,
            hospital TEXT,
            file_path TEXT,
            file_name TEXT,
            file_size INTEGER,
            mime_type TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS doctor_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            doctor_name TEXT NOT NULL,
            access_code TEXT UNIQUE NOT NULL,
            access_type TEXT NOT NULL,
            duration TEXT NOT NULL,
            note TEXT,
            status TEXT DEFAULT 'Active',
            expires_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS family_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relation TEXT NOT NULL,
            blood_group TEXT,
            allergies TEXT,
            conditions TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            icon TEXT DEFAULT '📌',
            title TEXT NOT NULL,
            description TEXT,
            event_date TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
}

initDatabase();

module.exports = db;
