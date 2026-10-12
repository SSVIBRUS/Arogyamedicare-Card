/**
 * MEDI-PASS Client API
 * Connects the frontend to the Express & SQLite backend
 */

(function (window) {
    // Automatically detect backend URL
    const isBackendHost = window.location.port === '5000';
    const isFileOrigin = window.location.protocol === 'file:';
    const API_BASE = (isBackendHost && !isFileOrigin) ? '' : 'http://localhost:5000';

    const TOKEN_KEY = 'mediPassToken';
    const PATIENT_KEY = 'mediPassPatient';
    const VITALS_KEY = 'mediPassVitals';
    const MEDICINES_KEY = 'mediPassMedicines';
    const REPORTS_KEY = 'mediPassReports';
    const DOCTOR_KEY = 'mediPassDoctorShares';
    const FAMILY_KEY = 'mediPassFamily';
    const TIMELINE_KEY = 'mediPassTimeline';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = { ...(options.headers || {}) };
        const token = getToken();

        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const isFormData = options.body instanceof FormData;
        if (!isFormData && options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = data.message || `Request failed with status ${response.status}`;
                const error = new Error(message);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            console.warn(`[MEDI-PASS API] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
            throw err;
        }
    }

    const API = {
        baseUrl: API_BASE,
        getToken,
        setToken,

        // AUTH & PROFILE
        auth: {
            async register(patientData) {
                const res = await apiRequest('/api/auth/register', {
                    method: 'POST',
                    body: patientData
                });
                if (res.token) {
                    setToken(res.token);
                }
                if (res.user) {
                    localStorage.setItem(PATIENT_KEY, JSON.stringify(res.user));
                }
                return res;
            },

            async login(email, password) {
                const res = await apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: { email, password }
                });
                if (res.token) {
                    setToken(res.token);
                }
                if (res.user) {
                    localStorage.setItem(PATIENT_KEY, JSON.stringify(res.user));
                }
                return res;
            },

            async getMe() {
                const res = await apiRequest('/api/auth/me', { method: 'GET' });
                if (res.user) {
                    localStorage.setItem(PATIENT_KEY, JSON.stringify(res.user));
                }
                return res.user;
            },

            async updateProfile(profileData) {
                const res = await apiRequest('/api/auth/profile', {
                    method: 'PUT',
                    body: profileData
                });
                if (res.user) {
                    localStorage.setItem(PATIENT_KEY, JSON.stringify(res.user));
                }
                return res.user;
            },

            logout() {
                setToken('');
                localStorage.removeItem(PATIENT_KEY);
                localStorage.removeItem(VITALS_KEY);
                localStorage.removeItem(MEDICINES_KEY);
                localStorage.removeItem(REPORTS_KEY);
                localStorage.removeItem(DOCTOR_KEY);
                localStorage.removeItem(FAMILY_KEY);
                localStorage.removeItem(TIMELINE_KEY);
                window.location.replace('index.html');
            }
        },

        // VITALS
        vitals: {
            async getAll() {
                const res = await apiRequest('/api/vitals', { method: 'GET' });
                if (res.data) {
                    localStorage.setItem(VITALS_KEY, JSON.stringify(res.data));
                }
                return res.data || [];
            },

            async add(vitalData) {
                const res = await apiRequest('/api/vitals', {
                    method: 'POST',
                    body: vitalData
                });
                return res.data;
            },

            async delete(id) {
                return await apiRequest(`/api/vitals/${id}`, { method: 'DELETE' });
            }
        },

        // MEDICINES
        medicines: {
            async getAll() {
                const res = await apiRequest('/api/medicines', { method: 'GET' });
                if (res.data) {
                    localStorage.setItem(MEDICINES_KEY, JSON.stringify(res.data));
                }
                return res.data || [];
            },

            async add(medicineData) {
                const res = await apiRequest('/api/medicines', {
                    method: 'POST',
                    body: medicineData
                });
                return res.data;
            },

            async delete(id) {
                return await apiRequest(`/api/medicines/${id}`, { method: 'DELETE' });
            }
        },

        // REPORTS
        reports: {
            async getAll() {
                const res = await apiRequest('/api/reports', { method: 'GET' });
                if (res.data) {
                    localStorage.setItem(REPORTS_KEY, JSON.stringify(res.data));
                }
                return res.data || [];
            },

            async add(reportDataOrFormData) {
                const res = await apiRequest('/api/reports', {
                    method: 'POST',
                    body: reportDataOrFormData
                });
                return res.data;
            },

            async delete(id) {
                return await apiRequest(`/api/reports/${id}`, { method: 'DELETE' });
            }
        },

        // DOCTOR SHARES
        doctorShares: {
            async getAll() {
                const res = await apiRequest('/api/doctor-shares', { method: 'GET' });
                if (res.data) {
                    localStorage.setItem(DOCTOR_KEY, JSON.stringify(res.data));
                }
                return res.data || [];
            },

            async create(shareData) {
                const res = await apiRequest('/api/doctor-shares', {
                    method: 'POST',
                    body: shareData
                });
                return res.data;
            },

            async revoke(id) {
                return await apiRequest(`/api/doctor-shares/${id}`, { method: 'DELETE' });
            },

            async getByCode(code) {
                const res = await apiRequest(`/api/doctor-shares/access/${code}`, { method: 'GET' });
                return res.data;
            }
        },

        // FAMILY MEMBERS
        family: {
            async getAll() {
                const res = await apiRequest('/api/family', { method: 'GET' });
                if (res.data) {
                    localStorage.setItem(FAMILY_KEY, JSON.stringify(res.data));
                }
                return res.data || [];
            },

            async add(memberData) {
                const res = await apiRequest('/api/family', {
                    method: 'POST',
                    body: memberData
                });
                return res.data;
            },

            async delete(id) {
                return await apiRequest(`/api/family/${id}`, { method: 'DELETE' });
            }
        },

        // TIMELINE
        timeline: {
            async getAll() {
                const res = await apiRequest('/api/timeline', { method: 'GET' });
                if (res.data) {
                    localStorage.setItem(TIMELINE_KEY, JSON.stringify(res.data));
                }
                return res.data || [];
            },

            async add(eventData) {
                const res = await apiRequest('/api/timeline', {
                    method: 'POST',
                    body: eventData
                });
                return res.data;
            },

            async delete(id) {
                return await apiRequest(`/api/timeline/${id}`, { method: 'DELETE' });
            }
        },

        // EMERGENCY
        emergency: {
            async getMe() {
                const res = await apiRequest('/api/emergency/me', { method: 'GET' });
                return res.data;
            },

            async getByUserId(userId) {
                const res = await apiRequest(`/api/emergency/${userId}`, { method: 'GET' });
                return res.data;
            }
        },

        // AI MEMORY
        aiMemory: {
            async get() {
                const res = await apiRequest('/api/ai-memory', { method: 'GET' });
                return res.data;
            }
        },

        // HEALTH
        async health() {
            try {
                const res = await apiRequest('/api/health', { method: 'GET' });
                return res.status === 'ok';
            } catch (_) {
                return false;
            }
        }
    };

    window.MediPassAPI = API;
})(window);
