/**
 * MEDI-PASS Client Authentication & Form Handling
 */

async function registerPatient(event) {
    if (event) event.preventDefault();

    const submitBtn = event && event.target ? event.target.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating profile...';
    }

    const patientData = {
        name: document.getElementById("name") ? document.getElementById("name").value.trim() : "",
        dob: document.getElementById("dob") ? document.getElementById("dob").value : "",
        age: document.getElementById("age") ? document.getElementById("age").value : "",
        gender: document.getElementById("gender") ? document.getElementById("gender").value : "",
        mobile: document.getElementById("mobile") ? document.getElementById("mobile").value.trim() : "",
        email: document.getElementById("email") ? document.getElementById("email").value.trim() : "",
        password: document.getElementById("password") ? document.getElementById("password").value : "medipass@123",

        // Health information
        blood: document.getElementById("blood") ? document.getElementById("blood").value : (document.getElementById("bloodGroup") ? document.getElementById("bloodGroup").value : ""),
        bloodGroup: document.getElementById("bloodGroup") ? document.getElementById("bloodGroup").value : (document.getElementById("blood") ? document.getElementById("blood").value : ""),
        height: document.getElementById("height") ? document.getElementById("height").value : "",
        weight: document.getElementById("weight") ? document.getElementById("weight").value : "",
        bloodPressure: document.getElementById("bloodPressure") ? document.getElementById("bloodPressure").value.trim() : "",
        heartRate: document.getElementById("heartRate") ? document.getElementById("heartRate").value : "",
        spo2: document.getElementById("spo2") ? document.getElementById("spo2").value : "",
        bloodSugar: document.getElementById("bloodSugar") ? document.getElementById("bloodSugar").value.trim() : "",

        // Emergency information
        emergencyName: document.getElementById("emergencyName") ? document.getElementById("emergencyName").value.trim() : (document.getElementById("emergencyContactName") ? document.getElementById("emergencyContactName").value.trim() : ""),
        emergencyPhone: document.getElementById("emergencyPhone") ? document.getElementById("emergencyPhone").value.trim() : (document.getElementById("emergencyContactPhone") ? document.getElementById("emergencyContactPhone").value.trim() : ""),
        emergencyRelation: document.getElementById("emergencyContactRelation") ? document.getElementById("emergencyContactRelation").value.trim() : "",

        // Medical information
        conditions: document.getElementById("conditions") ? document.getElementById("conditions").value.trim() : "",
        allergies: document.getElementById("allergies") ? document.getElementById("allergies").value.trim() : "",
        currentMedicines: document.getElementById("currentMedicines") ? document.getElementById("currentMedicines").value.trim() : "",

        // Other
        abha: document.getElementById("abha") ? document.getElementById("abha").value.trim() : "",
        language: document.getElementById("language") ? document.getElementById("language").value : "English"
    };

    // Save to localStorage as immediate offline cache
    localStorage.setItem("mediPassPatient", JSON.stringify(patientData));

    const initialVital = {
        date: new Date().toISOString(),
        bloodPressure: patientData.bloodPressure,
        heartRate: patientData.heartRate,
        spo2: patientData.spo2,
        bloodSugar: patientData.bloodSugar,
        weight: patientData.weight
    };
    localStorage.setItem("mediPassVitals", JSON.stringify([initialVital]));

    // Try backend registration
    try {
        if (window.MediPassAPI && window.MediPassAPI.auth) {
            const res = await window.MediPassAPI.auth.register(patientData);
            console.log("Registered with backend:", res);
        }
    } catch (err) {
        console.warn("Backend registration notice:", err.message);
    }

    const message = document.getElementById("profileMessage");
    if (message) {
        message.classList.add("show");
        message.textContent = "✓ Medical profile created successfully!";
    }

    setTimeout(function () {
        window.location.href = "dashboard.html";
    }, 800);
}

// Function also used by register.html
function saveMedicalProfile(event) {
    return registerPatient(event);
}

async function loginUser(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    const submitBtn = event && event.target ? event.target.querySelector('button[type="submit"]') : null;

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email) {
        if (message) {
            message.textContent = "Please enter your email address.";
            message.className = "login-message error";
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Authenticating...";
    }

    // Attempt backend login first
    try {
        if (window.MediPassAPI && window.MediPassAPI.auth) {
            const res = await window.MediPassAPI.auth.login(email, password);
            if (message) {
                message.textContent = "Login successful! Opening your dashboard...";
                message.className = "login-message success";
            }
            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 600);
            return;
        }
    } catch (apiErr) {
        console.warn("Backend login error, attempting fallback:", apiErr.message);

        // Fallback to local storage
        const patientData = JSON.parse(localStorage.getItem("mediPassPatient"));

        if (!patientData) {
            if (message) {
                message.textContent = apiErr.message || "No account found. Please create your profile first.";
                message.className = "login-message error";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "🔐 Login to MEDI-PASS";
            }
            return;
        }

        if (patientData.email && email.toLowerCase() !== patientData.email.toLowerCase()) {
            if (message) {
                message.textContent = "Email address does not match our records.";
                message.className = "login-message error";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "🔐 Login to MEDI-PASS";
            }
            return;
        }

        if (patientData.password && password && password !== patientData.password) {
            if (message) {
                message.textContent = "Incorrect password. Please try again.";
                message.className = "login-message error";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "🔐 Login to MEDI-PASS";
            }
            return;
        }

        if (message) {
            message.textContent = "Login successful! Opening your dashboard...";
            message.className = "login-message success";
        }

        setTimeout(function () {
            window.location.href = "dashboard.html";
        }, 600);
    }
}