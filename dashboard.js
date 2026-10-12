/**
 * MEDI-PASS Dashboard Controller
 * Full backend integration for vitals, medicines, reports, doctor shares, family, and timeline.
 */

let patientData = JSON.parse(localStorage.getItem("mediPassPatient")) || {};
let savedMedicines = JSON.parse(localStorage.getItem("mediPassMedicines")) || [];
let savedReports = JSON.parse(localStorage.getItem("mediPassReports")) || [];
let familyProfiles = JSON.parse(localStorage.getItem("mediPassFamily")) || [];
let doctorShares = JSON.parse(localStorage.getItem("mediPassDoctorShares")) || [];
let timelineEvents = JSON.parse(localStorage.getItem("mediPassTimeline")) || [];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
}

function getInitials(name) {
    if (!name) return "MP";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function savePatient() {
    localStorage.setItem("mediPassPatient", JSON.stringify(patientData));
}

function refreshDashboard() {
    const pName = document.getElementById("patientName");
    const profName = document.getElementById("profileName");
    const profEmail = document.getElementById("profileEmail");
    const profInitials = document.getElementById("profileInitials");
    const healthStat = document.getElementById("healthStatus");
    const allergyStat = document.getElementById("allergyStatus");
    const medStat = document.getElementById("medicineStatus");

    if (pName) pName.textContent = patientData.name || "Patient";
    if (profName) profName.textContent = patientData.name || "MEDI-PASS User";
    if (profEmail) profEmail.textContent = patientData.email || "No email available";
    if (profInitials) profInitials.textContent = getInitials(patientData.name);

    const hasVitals = patientData.bloodPressure || patientData.heartRate || patientData.spo2 || patientData.bloodSugar;
    if (healthStat) healthStat.textContent = hasVitals ? "Vitals Available" : "Profile Available";

    if (allergyStat) {
        allergyStat.textContent = patientData.allergies && patientData.allergies.trim()
            ? "Allergy Recorded" : "No Allergy Recorded";
    }

    if (medStat) {
        medStat.textContent = savedMedicines.length
            ? savedMedicines.length + " medicine(s)"
            : (patientData.currentMedicines ? "Medicines available" : "No medicines added");
    }
}

// Initial offline render
refreshDashboard();

// Load live data from backend
async function initDashboardFromBackend() {
    if (!window.MediPassAPI) return;

    try {
        const token = window.MediPassAPI.getToken();
        if (token) {
            const me = await window.MediPassAPI.auth.getMe().catch(() => null);
            if (me) {
                patientData = me;
                savePatient();
            }
        }

        const [meds, reps, shares, fam, tl] = await Promise.allSettled([
            window.MediPassAPI.medicines.getAll(),
            window.MediPassAPI.reports.getAll(),
            window.MediPassAPI.doctorShares.getAll(),
            window.MediPassAPI.family.getAll(),
            window.MediPassAPI.timeline.getAll()
        ]);

        if (meds.status === 'fulfilled' && Array.isArray(meds.value)) savedMedicines = meds.value;
        if (reps.status === 'fulfilled' && Array.isArray(reps.value)) savedReports = reps.value;
        if (shares.status === 'fulfilled' && Array.isArray(shares.value)) doctorShares = shares.value;
        if (fam.status === 'fulfilled' && Array.isArray(fam.value)) familyProfiles = fam.value;
        if (tl.status === 'fulfilled' && Array.isArray(tl.value)) timelineEvents = tl.value;

        refreshDashboard();
    } catch (err) {
        console.warn("Backend sync notice:", err);
    }
}

document.addEventListener("DOMContentLoaded", initDashboardFromBackend);

/* PROFILE */
function toggleProfile() {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) dropdown.classList.toggle("show");
}

document.addEventListener("click", function (event) {
    const area = document.querySelector(".profile-area");
    const dropdown = document.getElementById("profileDropdown");
    if (area && dropdown && !area.contains(event.target)) {
        dropdown.classList.remove("show");
    }
});

/* FEATURE PANEL */
function showFeature(feature, clickedButton) {
    const panel = document.getElementById("featureDetailPanel");
    if (!panel) return;

    document.querySelectorAll(".feature-dashboard-card").forEach(card => card.classList.remove("active"));
    if (clickedButton) {
        const parentCard = clickedButton.closest(".feature-dashboard-card");
        if (parentCard) parentCard.classList.add("active");
    }

    const builders = {
        vitals: renderVitals,
        medicines: renderMedicines,
        allergies: renderAllergies,
        reports: renderReports,
        ai: renderAI,
        doctor: renderDoctor,
        family: renderFamily,
        timeline: renderTimeline
    };

    panel.innerHTML = builders[feature] ? builders[feature]() : "";
    panel.classList.add("show");

    setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

/* VITALS */
function renderVitals() {
    return `
        <div class="feature-detail-header">
            <h2>❤️ Current Health Vitals</h2>
            <p>View and update the latest health measurements saved in MEDI-PASS.</p>
        </div>
        <div class="vitals-grid">
            <div class="vital-card"><span>Blood Pressure</span><strong>${escapeHTML(patientData.bloodPressure || "--")}</strong><small>mmHg</small></div>
            <div class="vital-card"><span>Heart Rate</span><strong>${escapeHTML(patientData.heartRate || "--")}</strong><small>BPM</small></div>
            <div class="vital-card"><span>SpO₂</span><strong>${escapeHTML(patientData.spo2 ? (patientData.spo2 + (String(patientData.spo2).includes('%') ? '' : '%')) : "--")}</strong><small>Oxygen Level</small></div>
            <div class="vital-card"><span>Blood Sugar</span><strong>${escapeHTML(patientData.bloodSugar || "--")}</strong><small>mg/dL</small></div>
        </div>
        <div class="feature-form">
            <h3>Update Health Vitals</h3>
            <div class="form-grid">
                <div class="form-group"><label>Blood Pressure</label><input id="vBP" value="${escapeHTML(patientData.bloodPressure || "")}" placeholder="e.g. 120/80"></div>
                <div class="form-group"><label>Heart Rate</label><input id="vHR" value="${escapeHTML(patientData.heartRate || "")}" placeholder="e.g. 72"></div>
                <div class="form-group"><label>SpO₂</label><input id="vSpO2" value="${escapeHTML(patientData.spo2 || "")}" placeholder="e.g. 98"></div>
                <div class="form-group"><label>Blood Sugar</label><input id="vSugar" value="${escapeHTML(patientData.bloodSugar || "")}" placeholder="e.g. 95"></div>
            </div>
            <div class="action-row"><button class="card-button" onclick="saveVitals()">💾 Save Vitals</button></div>
        </div>`;
}

async function saveVitals() {
    const bp = document.getElementById("vBP").value.trim();
    const hr = document.getElementById("vHR").value.trim();
    const spo2 = document.getElementById("vSpO2").value.trim();
    const sugar = document.getElementById("vSugar").value.trim();

    patientData.bloodPressure = bp;
    patientData.heartRate = hr;
    patientData.spo2 = spo2;
    patientData.bloodSugar = sugar;
    savePatient();

    if (window.MediPassAPI) {
        try {
            await window.MediPassAPI.vitals.add({
                bloodPressure: bp,
                heartRate: hr,
                spo2: spo2,
                bloodSugar: sugar
            });
            const me = await window.MediPassAPI.auth.getMe().catch(() => null);
            if (me) patientData = me;
            timelineEvents = await window.MediPassAPI.timeline.getAll().catch(() => timelineEvents);
        } catch (e) {
            console.warn("Vitals API fallback:", e);
            addTimelineEvent("❤️", "Health vitals updated", "Latest vitals were saved to the medical profile.");
        }
    } else {
        addTimelineEvent("❤️", "Health vitals updated", "Latest vitals were saved to the medical profile.");
    }

    refreshDashboard();
    showFeature("vitals", document.querySelector("#feature-vitals-card .card-button"));
}

/* MEDICINES */
function renderMedicines() {
    const list = savedMedicines.length ? savedMedicines.map((m, i) => `
        <div class="record-card">
            <h4>💊 ${escapeHTML(m.name || m.medicineName || "Medicine")}</h4>
            <p><strong>Dosage:</strong> ${escapeHTML(m.dosage || "Not specified")}</p>
            <p><strong>Timing:</strong> ${escapeHTML(m.timing || "Not specified")}</p>
            ${m.notes ? `<p><strong>Notes:</strong> ${escapeHTML(m.notes)}</p>` : ""}
            <div class="action-row">
                <button class="danger-btn" onclick="deleteMedicine(${m.id ? `'${m.id}'` : i})">Delete</button>
            </div>
        </div>`).join("") : `<div class="empty-state">No medicines added yet. Add a medicine below.</div>`;

    return `
        <div class="feature-detail-header"><h2>💊 Current Medicines</h2><p>Add, review and remove current medication records.</p></div>
        <div class="feature-list">${list}</div>
        <div class="feature-form">
            <h3>➕ Add Medicine</h3>
            <div class="form-grid">
                <div class="form-group"><label>Medicine Name *</label><input id="mName" placeholder="Medicine name"></div>
                <div class="form-group"><label>Dosage</label><input id="mDose" placeholder="e.g. 500 mg"></div>
                <div class="form-group"><label>Timing</label><input id="mTiming" placeholder="e.g. Morning & Night"></div>
                <div class="form-group"><label>Notes</label><input id="mNotes" placeholder="Optional notes"></div>
            </div>
            <div class="action-row"><button class="card-button" onclick="addMedicine()">💾 Save Medicine</button></div>
        </div>`;
}

async function addMedicine() {
    const name = document.getElementById("mName").value.trim();
    if (!name) return;
    const dosage = document.getElementById("mDose").value.trim();
    const timing = document.getElementById("mTiming").value.trim();
    const notes = document.getElementById("mNotes").value.trim();

    if (window.MediPassAPI) {
        try {
            await window.MediPassAPI.medicines.add({ name, dosage, timing, notes });
            savedMedicines = await window.MediPassAPI.medicines.getAll();
            timelineEvents = await window.MediPassAPI.timeline.getAll().catch(() => timelineEvents);
        } catch (e) {
            console.warn("Medicines API fallback:", e);
            savedMedicines.push({ name, dosage, timing, notes });
            localStorage.setItem("mediPassMedicines", JSON.stringify(savedMedicines));
            addTimelineEvent("💊", "Medicine added", name + " was added to current medicines.");
        }
    } else {
        savedMedicines.push({ name, dosage, timing, notes });
        localStorage.setItem("mediPassMedicines", JSON.stringify(savedMedicines));
        addTimelineEvent("💊", "Medicine added", name + " was added to current medicines.");
    }

    refreshDashboard();
    showFeature("medicines", document.querySelector("#feature-medicines-card .card-button"));
}

async function deleteMedicine(identifier) {
    if (window.MediPassAPI) {
        try {
            const numId = parseInt(identifier, 10);
            const found = savedMedicines.find(m => m.id === numId);
            if (found && found.id) {
                await window.MediPassAPI.medicines.delete(found.id);
                savedMedicines = await window.MediPassAPI.medicines.getAll();
            } else {
                savedMedicines.splice(identifier, 1);
                localStorage.setItem("mediPassMedicines", JSON.stringify(savedMedicines));
            }
        } catch (_) {
            savedMedicines.splice(identifier, 1);
            localStorage.setItem("mediPassMedicines", JSON.stringify(savedMedicines));
        }
    } else {
        savedMedicines.splice(identifier, 1);
        localStorage.setItem("mediPassMedicines", JSON.stringify(savedMedicines));
    }

    refreshDashboard();
    showFeature("medicines", document.querySelector("#feature-medicines-card .card-button"));
}

/* ALLERGIES */
function renderAllergies() {
    const allergy = patientData.allergies || "";
    return `
        <div class="feature-detail-header"><h2>⚠️ Allergies & Alerts</h2><p>Keep important allergy information clearly available for medical awareness.</p></div>
        <div class="detail-box alert-detail"><h3>Current Allergy Information</h3><p>${escapeHTML(allergy || "No allergy recorded.")}</p><small>Keep this information updated if your medical profile changes.</small></div>
        <div class="feature-form">
            <h3>Update Allergy Record</h3>
            <div class="form-group"><label>Allergies</label><textarea id="allergyInput" placeholder="Enter allergies or type None">${escapeHTML(allergy)}</textarea></div>
            <div class="action-row"><button class="card-button" onclick="saveAllergy()">💾 Save Allergy Record</button></div>
        </div>`;
}

async function saveAllergy() {
    patientData.allergies = document.getElementById("allergyInput").value.trim();
    savePatient();

    if (window.MediPassAPI) {
        try {
            await window.MediPassAPI.auth.updateProfile({ allergies: patientData.allergies });
            timelineEvents = await window.MediPassAPI.timeline.getAll().catch(() => timelineEvents);
        } catch (e) {
            console.warn("Allergy update API notice:", e);
            addTimelineEvent("⚠️", "Allergy record updated", "Allergy information was updated.");
        }
    } else {
        addTimelineEvent("⚠️", "Allergy record updated", "Allergy information was updated.");
    }

    refreshDashboard();
    showFeature("allergies", document.querySelector("#feature-allergies-card .card-button"));
}

/* REPORTS */
function renderReports() {
    const list = savedReports.length ? savedReports.map((r, i) => `
        <div class="record-card">
            <h4>📄 ${escapeHTML(r.name)}</h4>
            <p><strong>Date:</strong> ${escapeHTML(r.date)}</p>
            <p><strong>Type:</strong> ${escapeHTML(r.type || "Medical report")}</p>
            ${r.hospital ? `<p><strong>Hospital/Lab:</strong> ${escapeHTML(r.hospital)}</p>` : ""}
            ${r.fileName ? `<p><strong>File:</strong> ${escapeHTML(r.fileName)}</p>` : ""}
            ${r.fileUrl ? `<p><a href="${r.fileUrl}" target="_blank" style="color:#1976d2;font-weight:600;text-decoration:none;">📥 View/Download File</a></p>` : ""}
            <div class="action-row">
                <button class="secondary-btn" onclick="toggleReportDetail(${i})">👁 View Details</button>
                <button class="danger-btn" onclick="deleteMedicalReport(${r.id ? `'${r.id}'` : i})">Delete</button>
            </div>
            <div id="reportDetail${i}" class="report-detail">
                <strong>${escapeHTML(r.name)}</strong><br>
                Date: ${escapeHTML(r.date)}<br>
                Type: ${escapeHTML(r.type || "Medical report")}<br>
                ${r.hospital ? `Hospital/Lab: ${escapeHTML(r.hospital)}<br>` : ""}
                ${r.fileName ? `Attached file: ${escapeHTML(r.fileName)}<br>` : "No file attached.<br>"}
                ${r.fileUrl ? `<a href="${r.fileUrl}" target="_blank" style="color:#1976d2;">Open Document</a>` : ""}
            </div>
        </div>`).join("") : `<div class="empty-state">No medical reports added yet. Add your first report below.</div>`;

    return `
        <div class="feature-detail-header"><h2>📄 Medical Reports</h2><p>Store and organize prescriptions, blood reports, ECG, X-ray and other records.</p></div>
        <div class="feature-list">${list}</div>
        <div class="feature-form">
            <h3>➕ Add New Report</h3>
            <div class="form-grid">
                <div class="form-group"><label>Report Name *</label><input id="rName" placeholder="e.g. Blood Test Report"></div>
                <div class="form-group"><label>Report Date *</label><input id="rDate" type="date"></div>
                <div class="form-group"><label>Report Type</label><select id="rType"><option>Blood Report</option><option>Prescription</option><option>ECG</option><option>X-Ray</option><option>Scan / Imaging</option><option>Other</option></select></div>
                <div class="form-group"><label>Hospital / Lab</label><input id="rHospital" placeholder="Hospital or laboratory"></div>
                <div class="form-group full"><label>Attach File</label><input id="rFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"></div>
            </div>
            <div class="action-row"><button class="card-button" onclick="saveMedicalReport()">💾 Save Report</button></div>
        </div>`;
}

async function saveMedicalReport() {
    const name = document.getElementById("rName").value.trim();
    const date = document.getElementById("rDate").value;
    if (!name || !date) return;
    const file = document.getElementById("rFile").files[0];
    const type = document.getElementById("rType").value;
    const hospital = document.getElementById("rHospital").value.trim();

    if (window.MediPassAPI) {
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('date', date);
            formData.append('type', type);
            formData.append('hospital', hospital);
            if (file) formData.append('file', file);

            await window.MediPassAPI.reports.add(formData);
            savedReports = await window.MediPassAPI.reports.getAll();
            timelineEvents = await window.MediPassAPI.timeline.getAll().catch(() => timelineEvents);
        } catch (e) {
            console.warn("Report upload fallback:", e);
            savedReports.push({ id: Date.now(), name, date, type, hospital, fileName: file ? file.name : "" });
            localStorage.setItem("mediPassReports", JSON.stringify(savedReports));
        }
    } else {
        savedReports.push({ id: Date.now(), name, date, type, hospital, fileName: file ? file.name : "" });
        localStorage.setItem("mediPassReports", JSON.stringify(savedReports));
    }

    showFeature("reports", document.querySelector("#feature-reports-card .card-button"));
}

function toggleReportDetail(index) {
    const el = document.getElementById("reportDetail" + index);
    if (el) el.classList.toggle("show");
}

async function deleteMedicalReport(identifier) {
    if (window.MediPassAPI) {
        try {
            const numId = parseInt(identifier, 10);
            const found = savedReports.find(r => r.id === numId);
            if (found && found.id) {
                await window.MediPassAPI.reports.delete(found.id);
                savedReports = await window.MediPassAPI.reports.getAll();
            } else {
                savedReports.splice(identifier, 1);
                localStorage.setItem("mediPassReports", JSON.stringify(savedReports));
            }
        } catch (_) {
            savedReports.splice(identifier, 1);
            localStorage.setItem("mediPassReports", JSON.stringify(savedReports));
        }
    } else {
        savedReports.splice(identifier, 1);
        localStorage.setItem("mediPassReports", JSON.stringify(savedReports));
    }

    showFeature("reports", document.querySelector("#feature-reports-card .card-button"));
}

/* AI MEMORY */
function renderAI() {
    const events = buildTimeline().slice(-6).reverse();

    const eventHTML = events.length
        ? events.map(e => `
            <div class="timeline-item">
                ${e.icon}
                <strong>${escapeHTML(e.title)}</strong>
                <br>
                <small>
                    ${escapeHTML(e.description)} · ${escapeHTML(e.date)}
                </small>
            </div>
        `).join("")
        : `
            <div class="empty-state">
                Add vitals, medicines, reports or timeline events to build your health memory.
            </div>
        `;

    const allergyText = patientData.allergies && patientData.allergies.trim()
        ? patientData.allergies
        : "No allergies recorded";

    const conditionText = patientData.conditions && patientData.conditions.trim()
        ? patientData.conditions
        : "No medical conditions recorded";

    const medicinesHTML = savedMedicines.length
        ? savedMedicines.slice(0, 5).map(m => `
            <div class="memory-row">
                <span>💊</span>
                <div>
                    <strong>${escapeHTML(m.name || "Medicine")}</strong>
                    <small>${escapeHTML(m.dosage || "Dosage not recorded")}</small>
                </div>
            </div>
        `).join("")
        : `<div class="empty-state">No medicine records available.</div>`;

    const reportsHTML = savedReports.length
        ? savedReports.slice(0, 4).map(r => `
            <div class="memory-row">
                <span>📄</span>
                <div>
                    <strong>${escapeHTML(r.name || "Medical Report")}</strong>
                    <small>${escapeHTML(r.date || "Date not recorded")} · ${escapeHTML(r.type || "Medical report")}</small>
                </div>
            </div>
        `).join("")
        : `<div class="empty-state">No medical reports available.</div>`;

    const priorityItems = [];
    if (patientData.bloodGroup || patientData.blood) {
        priorityItems.push(`Blood group: ${escapeHTML(patientData.bloodGroup || patientData.blood)}`);
    }
    if (patientData.allergies && patientData.allergies.trim()) {
        priorityItems.push(`Allergies: ${escapeHTML(patientData.allergies)}`);
    }
    if (patientData.conditions && patientData.conditions.trim()) {
        priorityItems.push(`Conditions: ${escapeHTML(patientData.conditions)}`);
    }
    if (savedMedicines.length) {
        priorityItems.push(`${savedMedicines.length} current medicine record(s)`);
    }

    const priorityHTML = priorityItems.length
        ? priorityItems.map(item => `<li>✓ ${item}</li>`).join("")
        : `<li>✓ No critical alerts recorded yet.</li>`;

    return `
        <div class="feature-detail-header">
            <h2>🧠 AI Medical Memory</h2>
            <p>A smart summary of the medical information stored in your MEDI-PASS profile.</p>
        </div>

        <div class="detail-box ai-priority-box">
            <h3>🚨 What a Doctor Should Know First</h3>
            <ul class="priority-list">
                ${priorityHTML}
            </ul>
        </div>

        <div class="detail-box">
            <h3>🩺 Patient Health Summary</h3>
            <p style="line-height:1.7;color:#475467;">
                ${patientData.name ? `<strong>${escapeHTML(patientData.name)}</strong>` : "This patient"}
                has a MEDI-PASS health profile containing ${savedMedicines.length} medicine record(s),
                ${savedReports.length} medical report(s), and recorded medical information for clinical review.
            </p>
            <div class="ai-summary-grid">
                <div class="ai-summary-card"><span>🩸</span><strong>Blood Group</strong><p>${escapeHTML(patientData.bloodGroup || patientData.blood || "Not recorded")}</p></div>
                <div class="ai-summary-card"><span>⚠️</span><strong>Allergies</strong><p>${escapeHTML(allergyText)}</p></div>
                <div class="ai-summary-card"><span>🏥</span><strong>Conditions</strong><p>${escapeHTML(conditionText)}</p></div>
                <div class="ai-summary-card"><span>💊</span><strong>Medicines</strong><p>${savedMedicines.length} recorded</p></div>
            </div>
        </div>

        <div class="detail-box">
            <h3>💊 Current Medicines</h3>
            <div class="memory-list">${medicinesHTML}</div>
        </div>

        <div class="detail-box">
            <h3>📄 Medical Reports</h3>
            <div class="memory-list">${reportsHTML}</div>
        </div>

        <div class="detail-box">
            <h3>📅 Recent Medical Memory</h3>
            ${eventHTML}
        </div>`;
}

/* DOCTOR ACCESS */
function renderDoctor() {
    const shares = doctorShares.length
        ? doctorShares.map((s, i) => `
            <div class="record-card">
                <h4>🩺 ${escapeHTML(s.doctor || s.doctorName)}</h4>
                <p><strong>Access:</strong> ${escapeHTML(s.type || s.accessType || "Medical Access")}</p>
                <p>${escapeHTML(s.note || "Selected medical information shared.")}</p>
                <p class="record-meta">
                    Code: <strong style="color:#1976d2;">${escapeHTML(s.accessCode || s.shareCode || "--")}</strong> · Created: ${escapeHTML(s.date || "Active")}
                </p>
                <span class="status-pill">${escapeHTML(s.status || "Active")}</span>
                <div class="action-row">
                    <button class="danger-btn" onclick="revokeDoctorAccess(${s.id ? `'${s.id}'` : i})">🚫 Revoke Access</button>
                </div>
            </div>
        `).join("")
        : `
            <div class="empty-state">
                🔐 No active doctor access yet.
                <br>
                Create an access record to securely share selected medical information.
            </div>
        `;

    return `
        <div class="feature-detail-header">
            <h2>🩺 Doctor Access</h2>
            <p>Give an authorized doctor controlled access to the medical information they need.</p>
        </div>

        <div class="feature-form">
            <h3>👨‍⚕️ Create Doctor Access</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Doctor / Clinic Name *</label>
                    <input id="dName" placeholder="e.g. Dr. Sharma / City Hospital">
                </div>
                <div class="form-group">
                    <label>Access Type</label>
                    <select id="dType">
                        <option>Emergency Summary</option>
                        <option>Full Medical Memory</option>
                        <option>Reports Only</option>
                        <option>Medicines & Allergies</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Access Duration</label>
                    <select id="dDuration">
                        <option>15 Minutes</option>
                        <option>1 Hour</option>
                        <option>24 Hours</option>
                        <option>7 Days</option>
                    </select>
                </div>
                <div class="form-group full">
                    <label>Information Being Shared / Notes</label>
                    <textarea id="dNote" placeholder="Example: Blood group, allergies, medicines and emergency history"></textarea>
                </div>
            </div>
            <div class="action-row">
                <button class="card-button" onclick="addDoctorAccess()">🔗 Create Access Record</button>
            </div>
        </div>

        <div class="detail-box">
            <h3>📋 Active Doctor Access</h3>
            <div class="feature-list">${shares}</div>
        </div>`;
}

function generateShareCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const el = document.getElementById("shareCode");
    if (el) el.textContent = code;
}

async function addDoctorAccess() {
    const doctor = document.getElementById("dName").value.trim();
    if (!doctor) return;
    const type = document.getElementById("dType").value;
    const duration = document.getElementById("dDuration").value;
    const note = document.getElementById("dNote").value.trim();

    if (window.MediPassAPI) {
        try {
            await window.MediPassAPI.doctorShares.create({ doctor, accessType: type, duration, note });
            doctorShares = await window.MediPassAPI.doctorShares.getAll();
            timelineEvents = await window.MediPassAPI.timeline.getAll().catch(() => timelineEvents);
        } catch (e) {
            console.warn("Doctor share fallback:", e);
            doctorShares.push({ doctor, status: "Active", note: type + (note ? " — " + note : ""), date: new Date().toLocaleDateString() });
            localStorage.setItem("mediPassDoctorShares", JSON.stringify(doctorShares));
            addTimelineEvent("🩺", "Doctor access created", doctor + " was added as an access record.");
        }
    } else {
        doctorShares.push({ doctor, status: "Active", note: type + (note ? " — " + note : ""), date: new Date().toLocaleDateString() });
        localStorage.setItem("mediPassDoctorShares", JSON.stringify(doctorShares));
        addTimelineEvent("🩺", "Doctor access created", doctor + " was added as an access record.");
    }

    showFeature("doctor", document.querySelector("#feature-doctor-card .card-button"));
}

async function revokeDoctorAccess(identifier) {
    if (window.MediPassAPI) {
        try {
            const numId = parseInt(identifier, 10);
            const found = doctorShares.find(s => s.id === numId);
            if (found && found.id) {
                await window.MediPassAPI.doctorShares.revoke(found.id);
                doctorShares = await window.MediPassAPI.doctorShares.getAll();
            } else {
                doctorShares.splice(identifier, 1);
                localStorage.setItem("mediPassDoctorShares", JSON.stringify(doctorShares));
            }
        } catch (_) {
            doctorShares.splice(identifier, 1);
            localStorage.setItem("mediPassDoctorShares", JSON.stringify(doctorShares));
        }
    } else {
        doctorShares.splice(identifier, 1);
        localStorage.setItem("mediPassDoctorShares", JSON.stringify(doctorShares));
    }

    showFeature("doctor", document.querySelector("#feature-doctor-card .card-button"));
}

/* FAMILY */
function renderFamily() {
    const list = familyProfiles.length ? familyProfiles.map((f, i) => `
        <div class="record-card">
            <h4>👤 ${escapeHTML(f.name)}</h4>
            <p><strong>Relation:</strong> ${escapeHTML(f.relation)}</p>
            <p><strong>Blood Group:</strong> ${escapeHTML(f.bloodGroup || f.blood || "Not recorded")}</p>
            <p><strong>Allergies:</strong> ${escapeHTML(f.allergies || "None recorded")}</p>
            <div class="action-row">
                <button class="danger-btn" onclick="deleteFamily(${f.id ? `'${f.id}'` : i})">Delete Profile</button>
            </div>
        </div>`).join("") : `<div class="empty-state">No family profiles added yet.</div>`;

    return `
        <div class="feature-detail-header"><h2>👨‍👩‍👧 Family Profiles</h2><p>Maintain separate health profiles for family members.</p></div>
        <div class="feature-list">${list}</div>
        <div class="feature-form">
            <h3>➕ Add Family Member</h3>
            <div class="form-grid">
                <div class="form-group"><label>Name *</label><input id="fName" placeholder="Family member name"></div>
                <div class="form-group"><label>Relation *</label><input id="fRelation" placeholder="e.g. Parent, Sibling, Child"></div>
                <div class="form-group"><label>Blood Group</label><input id="fBlood" placeholder="e.g. O+"></div>
                <div class="form-group"><label>Allergies</label><input id="fAllergy" placeholder="None / allergy information"></div>
            </div>
            <div class="action-row"><button class="card-button" onclick="addFamily()">💾 Save Family Profile</button></div>
        </div>`;
}

async function addFamily() {
    const name = document.getElementById("fName").value.trim();
    const relation = document.getElementById("fRelation").value.trim();
    if (!name || !relation) return;
    const bloodGroup = document.getElementById("fBlood").value.trim();
    const allergies = document.getElementById("fAllergy").value.trim();

    if (window.MediPassAPI) {
        try {
            await window.MediPassAPI.family.add({ name, relation, bloodGroup, allergies });
            familyProfiles = await window.MediPassAPI.family.getAll();
            timelineEvents = await window.MediPassAPI.timeline.getAll().catch(() => timelineEvents);
        } catch (e) {
            console.warn("Family API fallback:", e);
            familyProfiles.push({ name, relation, bloodGroup, allergies });
            localStorage.setItem("mediPassFamily", JSON.stringify(familyProfiles));
            addTimelineEvent("👨‍👩‍👧", "Family profile added", name + " was added to family profiles.");
        }
    } else {
        familyProfiles.push({ name, relation, bloodGroup, allergies });
        localStorage.setItem("mediPassFamily", JSON.stringify(familyProfiles));
        addTimelineEvent("👨‍👩‍👧", "Family profile added", name + " was added to family profiles.");
    }

    showFeature("family", document.querySelector("#feature-family-card .card-button"));
}

async function deleteFamily(identifier) {
    if (window.MediPassAPI) {
        try {
            const numId = parseInt(identifier, 10);
            const found = familyProfiles.find(f => f.id === numId);
            if (found && found.id) {
                await window.MediPassAPI.family.delete(found.id);
                familyProfiles = await window.MediPassAPI.family.getAll();
            } else {
                familyProfiles.splice(identifier, 1);
                localStorage.setItem("mediPassFamily", JSON.stringify(familyProfiles));
            }
        } catch (_) {
            familyProfiles.splice(identifier, 1);
            localStorage.setItem("mediPassFamily", JSON.stringify(familyProfiles));
        }
    } else {
        familyProfiles.splice(identifier, 1);
        localStorage.setItem("mediPassFamily", JSON.stringify(familyProfiles));
    }

    showFeature("family", document.querySelector("#feature-family-card .card-button"));
}

/* TIMELINE */
function buildTimeline() {
    const events = [...timelineEvents];
    if (patientData.name && !events.some(e => e.title && e.title.includes("Profile Created"))) {
        events.push({ icon: "📋", title: "Patient profile created", description: "MEDI-PASS profile is initialized.", date: patientData.createdAt || "Profile" });
    }
    return events.sort((a, b) => (new Date(b.timestamp || b.date || 0)) - (new Date(a.timestamp || a.date || 0)));
}

function renderTimeline() {
    const events = buildTimeline().slice().reverse();

    const list = events.length
        ? events.map((e, index) => `
            <div class="smart-timeline-item">
                <div class="timeline-marker">${e.icon || "📌"}</div>
                <div class="timeline-content">
                    <div class="timeline-top">
                        <strong>${escapeHTML(e.title)}</strong>
                        <span>${escapeHTML(e.date)}</span>
                    </div>
                    <p>${escapeHTML(e.description)}</p>
                    ${index === 0 ? `<span class="timeline-current">● Latest Medical Activity</span>` : ""}
                </div>
            </div>
        `).join("")
        : `
            <div class="empty-state">
                📅 No medical events yet.<br>Add vitals, medicines, reports or events to build your timeline.
            </div>
        `;

    return `
        <div class="feature-detail-header">
            <h2>📅 Smart Medical Timeline</h2>
            <p>A chronological view of important medical activities stored in your MEDI-PASS profile.</p>
        </div>
        <div class="detail-box">
            <div class="timeline-summary">
                <div><strong>${events.length}</strong><span>Total Events</span></div>
                <div><strong>↕</strong><span>Latest First</span></div>
                <div><strong>🧠</strong><span>Auto Organized</span></div>
            </div>
            <div class="smart-timeline">${list}</div>
        </div>
        <div class="feature-form">
            <h3>➕ Add Medical Event</h3>
            <div class="form-grid">
                <div class="form-group"><label>Event Title *</label><input id="tTitle" placeholder="e.g. Doctor consultation"></div>
                <div class="form-group"><label>Date</label><input id="tDate" type="date"></div>
                <div class="form-group full"><label>Details</label><textarea id="tDesc" placeholder="Describe the medical event"></textarea></div>
            </div>
            <div class="action-row"><button class="card-button" onclick="addTimelineManual()">💾 Add Event</button></div>
        </div>`;
}

function addTimelineEvent(icon, title, description) {
    timelineEvents.push({ icon, title, description, date: new Date().toLocaleDateString(), timestamp: Date.now() });
    localStorage.setItem("mediPassTimeline", JSON.stringify(timelineEvents));
}

async function addTimelineManual() {
    const title = document.getElementById("tTitle").value.trim();
    if (!title) return;
    const desc = document.getElementById("tDesc").value.trim() || "Medical timeline event recorded.";
    const customDate = document.getElementById("tDate").value || new Date().toISOString().split('T')[0];

    if (window.MediPassAPI) {
        try {
            await window.MediPassAPI.timeline.add({ icon: "📌", title, description: desc, date: customDate });
            timelineEvents = await window.MediPassAPI.timeline.getAll();
        } catch (e) {
            console.warn("Timeline manual fallback:", e);
            timelineEvents.push({ icon: "📌", title, description: desc, date: customDate, timestamp: Date.now() });
            localStorage.setItem("mediPassTimeline", JSON.stringify(timelineEvents));
        }
    } else {
        timelineEvents.push({ icon: "📌", title, description: desc, date: customDate, timestamp: Date.now() });
        localStorage.setItem("mediPassTimeline", JSON.stringify(timelineEvents));
    }

    showFeature("timeline", document.querySelector("#feature-timeline-card .card-button"));
}

/* EMERGENCY CARD */
function toggleEmergencyCard() {
    const card = document.getElementById("emergencyCard");
    const button = document.getElementById("emergencyToggleBtn");
    if (!card) return;

    const hidden = card.style.display === "none" || card.style.display === "";
    card.style.display = hidden ? "block" : "none";

    if (hidden) {
        loadEmergencyCard();
        if (button) button.textContent = "✓ Emergency Mode Open";
        setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } else {
        if (button) button.textContent = "🚨 Open Emergency Mode";
    }
}

function refreshEmergencyCard() {
    loadEmergencyCard();
}

function loadEmergencyCard() {
    if (!patientData || !patientData.name) {
        patientData = JSON.parse(localStorage.getItem("mediPassPatient")) || {};
    }

    const eName = document.getElementById("emergencyName");
    const eBlood = document.getElementById("emergencyBloodGroup");
    const eAge = document.getElementById("emergencyAge");
    const eAllergies = document.getElementById("emergencyAllergies");
    const eConds = document.getElementById("emergencyConditions");
    const eContact = document.getElementById("emergencyContact");
    const eMeds = document.getElementById("emergencyMedicines");
    const eQR = document.getElementById("emergencyQR");

    if (eName) eName.textContent = patientData.name || "--";
    if (eBlood) eBlood.textContent = patientData.bloodGroup || patientData.blood || "--";
    if (eAge) eAge.textContent = patientData.age ? patientData.age + " years" : "--";
    if (eAllergies) eAllergies.textContent = patientData.allergies && patientData.allergies.trim() ? patientData.allergies : "None recorded";
    if (eConds) eConds.textContent = patientData.conditions && patientData.conditions.trim() ? patientData.conditions : "None recorded";
    if (eContact) {
        const contact = [patientData.emergencyContactName || patientData.emergencyName, patientData.emergencyContactPhone || patientData.emergencyPhone].filter(Boolean).join(" • ");
        eContact.textContent = contact || "--";
    }

    const medicineText = savedMedicines.length
        ? savedMedicines.slice(0, 3).map(m => [m.name, m.dosage].filter(Boolean).join(" — ")).join(", ") + (savedMedicines.length > 3 ? " + more" : "")
        : (patientData.currentMedicines || "None recorded");

    if (eMeds) eMeds.textContent = medicineText;

    const origin = (window.location.origin && window.location.origin.includes('http')) ? window.location.origin : 'http://localhost:5000';
    const emergencyScanUrl = `${origin}/emergency.html?id=${patientData.id || ''}`;

    const qrData = encodeURIComponent(
        emergencyScanUrl + "\n\n" +
        "MEDI-PASS Emergency Profile\n" +
        "Name: " + (patientData.name || "--") + "\n" +
        "Blood: " + (patientData.bloodGroup || patientData.blood || "--") + "\n" +
        "Allergies: " + (patientData.allergies || "None recorded") + "\n" +
        "Conditions: " + (patientData.conditions || "None recorded") + "\n" +
        "Medicines: " + medicineText + "\n" +
        "Emergency Contact: " + ([patientData.emergencyContactName || patientData.emergencyName, patientData.emergencyContactPhone || patientData.emergencyPhone].filter(Boolean).join(" ") || "--")
    );

    if (eQR) {
        eQR.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + qrData;
    }
}

function logout() {
    if (window.MediPassAPI && window.MediPassAPI.auth) {
        window.MediPassAPI.auth.logout();
    } else {
        localStorage.removeItem("mediPassPatient");
        localStorage.removeItem("mediPassToken");
        window.location.replace("./index.html");
    }
}
