function registerPatient(event) {
    event.preventDefault();

    const patientData = {
        // =========================
        // PERSONAL INFORMATION
        // =========================
        name: document.getElementById("name").value.trim(),
        dob: document.getElementById("dob").value,
        gender: document.getElementById("gender").value,
        mobile: document.getElementById("mobile").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
        // =========================
        // HEALTH INFORMATION
        // =========================
        blood: document.getElementById("blood").value,
        height: document.getElementById("height").value,
        weight: document.getElementById("weight").value,

        bloodPressure:
            document.getElementById("bloodPressure").value,

        heartRate:
            document.getElementById("heartRate").value,

        spo2:
            document.getElementById("spo2").value,

        bloodSugar:
            document.getElementById("bloodSugar").value,

        // =========================
        // EMERGENCY INFORMATION
        // =========================
        emergencyName:
            document.getElementById("emergencyName").value.trim(),

        emergencyPhone:
            document.getElementById("emergencyPhone").value.trim(),

        // =========================
        // MEDICAL INFORMATION
        // =========================
        conditions:
            document.getElementById("conditions").value.trim(),

        allergies:
            document.getElementById("allergies").value.trim(),

        // =========================
        // OTHER
        // =========================
        abha:
            document.getElementById("abha").value.trim(),

        language:
            document.getElementById("language").value,

        // =========================
        // RECORD INFORMATION
        // =========================
        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()
    };

    // =========================
    // SAVE PATIENT PROFILE
    // =========================
    localStorage.setItem(
        "mediPassPatient",
        JSON.stringify(patientData)
    );

    // =========================
    // SAVE FIRST VITAL READING
    // =========================
    const initialVital = {
        date: new Date().toISOString(),

        bloodPressure: patientData.bloodPressure,
        heartRate: patientData.heartRate,
        spo2: patientData.spo2,
        bloodSugar: patientData.bloodSugar,
        weight: patientData.weight
    };

    localStorage.setItem(
        "mediPassVitals",
        JSON.stringify([initialVital])
    );

    // =========================
    // OPEN DASHBOARD
    // =========================
    window.location.href = "dashboard.html";
}
function loginUser(event) {

    event.preventDefault();

    const patientData =
        JSON.parse(localStorage.getItem("mediPassPatient"));

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");


    if (!patientData) {

        message.textContent =
            "No MEDI-PASS account found. Please create your profile first.";

        message.className =
            "login-message error";

        return;
    }


    if (
        !patientData.email ||
        email.toLowerCase() !== patientData.email.toLowerCase()
    ) {

        message.textContent =
            "Email address does not match our records.";

        message.className =
            "login-message error";

        return;
    }


    if (!patientData.password || password !== patientData.password) {

        message.textContent =
            "Incorrect password. Please try again.";

        message.className =
            "login-message error";

        return;
    }


    message.textContent =
        "Login successful! Opening your dashboard...";

    message.className =
        "login-message success";


    setTimeout(function () {

        window.location.href = "dashboard.html";

    }, 700);

}