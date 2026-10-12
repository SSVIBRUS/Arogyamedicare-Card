# MEDI-PASS (Arogyamedicare-Card) 🩺

> Smarter Medical Memory, Faster Emergency Care.

MEDI-PASS is an intelligent healthcare card and medical profile platform. It allows users to store vital medical histories, prescriptions, lab reports, allergies, family profiles, and generate time-limited doctor access codes and paramedic-scannable emergency QR cards.

---

## 🌟 Key Features

* **🔐 Authentication & Profiles**: Secure patient registration, login with hashed passwords (`bcryptjs`), and JWT token session management.
* **❤️ Health Vitals Tracking**: Log blood pressure, heart rate, SpO₂, blood sugar, and weight with chronological trend history.
* **💊 Prescription & Medicine Management**: Track active medications, dosages, frequency, and instructions.
* **📄 Diagnostic Medical Reports**: Upload and view actual medical files (PDFs, lab reports, ECG, scans) via `multer`.
* **🩺 Time-Bound Doctor Access**: Generate temporary 6-character access codes (`MP-XXXXXX`) with automatic expiration (15m, 1h, 24h, 7d) and access level controls.
* **🔑 Doctor Portal**: Public code verification portal for physicians to review authorized patient medical summaries.
* **🚨 Emergency Profile & QR Code**: Life-critical emergency medical card accessible directly by first responders and paramedics via QR code.
* **🧠 AI Health Memory**: Synthesized clinical overview, adverse drug warnings, and abnormality flags.
* **👨‍👩‍👧 Family Health Circles**: Manage health cards for family members in one place.
* **📅 Chronological Medical Timeline**: Auto-updating and manual medical event history.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+), responsive design, QR code generation.
* **Backend**: Node.js & Express.js.
* **Database**: SQLite (powered by Node's native `node:sqlite` — zero external database server setup or C++ dependencies).
* **Security & Auth**: `bcryptjs` password hashing, `jsonwebtoken` (JWT), CORS, Multer file upload filters.

---

## 🚀 Getting Started Locally

### Prerequisites
* Node.js **>= 22.5.0** (for native `node:sqlite` support)
* npm

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SSVIBRUS/Arogyamedicare-Card.git
   cd Arogyamedicare-Card
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables (optional)**:
   ```bash
   cp .env.example .env
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open in browser**:
   Visit [http://localhost:5000](http://localhost:5000)

---

## 🌐 Cloud Deployment Guide

### Deploying to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect this GitHub repository.
3. Set the following build and start commands:
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
4. Add environment variables:
   * `JWT_SECRET`: your secret random string
   * `NODE_VERSION`: `22` (or higher)
5. Deploy!

### Deploying to Railway
1. Click **New Project** -> **Deploy from GitHub repo** on [Railway](https://railway.app).
2. Railway detects `package.json` automatically and starts the service using `npm start`.
3. Add `JWT_SECRET` in the **Variables** tab.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new patient account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/auth/me` | Fetch logged-in patient profile | Yes |
| `PUT` | `/api/auth/profile` | Update profile information | Yes |
| `GET` | `/api/vitals` | List vitals history | Yes |
| `POST` | `/api/vitals` | Record vital reading | Yes |
| `GET` | `/api/medicines` | List all medications | Yes |
| `POST` | `/api/medicines` | Add medication | Yes |
| `DELETE` | `/api/medicines/:id` | Delete medication | Yes |
| `GET` | `/api/reports` | List diagnostic reports | Yes |
| `POST` | `/api/reports` | Upload report with attachment | Yes |
| `DELETE` | `/api/reports/:id` | Delete report & unlinks file | Yes |
| `GET` | `/api/doctor-shares` | List active doctor grants | Yes |
| `POST` | `/api/doctor-shares` | Create temporary access grant | Yes |
| `DELETE` | `/api/doctor-shares/:id`| Revoke access grant | Yes |
| `GET` | `/api/doctor-shares/access/:code` | Public doctor portal view | No |
| `GET` | `/api/emergency/me` | Logged-in emergency card | Yes |
| `GET` | `/api/emergency/:userId` | Paramedic QR emergency scan | No |
| `GET` | `/api/ai-memory` | AI clinical synthesis | Yes |
| `GET` | `/api/family` | List family members | Yes |
| `POST` | `/api/family` | Add family member | Yes |
| `GET` | `/api/timeline` | Get chronological events | Yes |
| `GET` | `/api/health` | Health check endpoint | No |
