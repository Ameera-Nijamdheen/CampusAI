// ==========================================================
// CampusAI Master Frontend Engine (Full-Stack Connected)
// Real REST API integration, Groq AI Career & Study Guidance,
// JWT Authentication, Profile Management & Opportunities
// ==========================================================

const API_BASE = ""; // Relative to host (served on same origin)

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✓" : type === "error" ? "⚠️" : "ℹ️";
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- AUTH STATE & TOKEN HELPERS ---
function getAuthToken() {
    return localStorage.getItem("campusai_token") || "";
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem("campusai_token", token);
    } else {
        localStorage.removeItem("campusai_token");
    }
}

function getStoredUser() {
    try {
        const u = localStorage.getItem("campusai_user");
        return u ? JSON.parse(u) : null;
    } catch (e) {
        return null;
    }
}

function setStoredUser(user) {
    if (user) {
        localStorage.setItem("campusai_user", JSON.stringify(user));
        localStorage.setItem("userName", user.name || "");
        localStorage.setItem("userEmail", user.email || "");
    } else {
        localStorage.removeItem("campusai_user");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
    }
}

function clearAllUserSessionData() {
    localStorage.removeItem("campusai_token");
    localStorage.removeItem("campusai_user");
    localStorage.removeItem("campusai_profile_completed");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentCollege");
    localStorage.removeItem("studentCourse");
    localStorage.removeItem("studentYear");
    localStorage.removeItem("studentSkills");
    localStorage.removeItem("studentPlace");
    localStorage.removeItem("studentRole");
    localStorage.removeItem("applicantName");
    localStorage.removeItem("campusai_achievements");
}

// --- PROFILE COMPLETION VERIFIER ---
function isProfileCompleted() {
    if (localStorage.getItem("campusai_profile_completed") === "true") {
        return true;
    }
    const name = localStorage.getItem("studentName") || (getStoredUser() && getStoredUser().name);
    const college = localStorage.getItem("studentCollege");
    const course = localStorage.getItem("studentCourse");
    const year = localStorage.getItem("studentYear");
    const role = localStorage.getItem("studentRole");
    const skills = localStorage.getItem("studentSkills");

    if (name && college && course && year && role && skills &&
        college.trim() !== "" && course.trim() !== "" && year.trim() !== "" &&
        role.trim() !== "" && skills.trim() !== "") {
        localStorage.setItem("campusai_profile_completed", "true");
        return true;
    }
    return false;
}

// --- STRICT AUTHENTICATION & MANDATORY ONBOARDING WALL ---
// 1. Unauthenticated users cannot access members-only pages
// 2. Authenticated users with incomplete profiles CANNOT skip registration details
function enforceAuthWall() {
    const path = window.location.pathname;
    const isPublicPage = path.endsWith("login.html") || path.endsWith("register.html");
    const token = getAuthToken();
    const user = getStoredUser();

    // Not logged in -> redirect to login
    if (!isPublicPage && (!token || !user)) {
        const page = path.split("/").pop() || "index.html";
        sessionStorage.setItem("campusai_login_prompt", "Please log in to access CampusAI.");
        const redirectParam = (page && page !== "login.html" && page !== "register.html") ? `?redirect=${encodeURIComponent(page)}` : "";
        window.location.replace("login.html" + redirectParam);
        return false;
    }

    // Logged in, but profile is incomplete -> strictly gate to student.html
    if (!isPublicPage && token && user && !path.endsWith("student.html")) {
        if (!isProfileCompleted()) {
            sessionStorage.setItem("campusai_login_prompt", "Profile completion is mandatory before accessing CampusAI features.");
            window.location.replace("student.html?mandatory=true");
            return false;
        }
    }

    return true;
}

// Run auth wall check immediately
enforceAuthWall();

// Unified API Fetch Wrapper
async function apiFetch(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = getAuthToken();

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const config = {
        ...options,
        headers
    };

    try {
        const res = await fetch(API_BASE + endpoint, config);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            if (res.status === 401 && !endpoint.includes("/api/auth/login") && !endpoint.includes("/api/auth/register")) {
                clearAllUserSessionData();
                showToast("Session expired. Please log in again.", "error");
                const nav = document.getElementById("mainNavbar");
                if (nav) {
                    nav.remove();
                    renderCampusNavbar();
                }
            }
            throw new Error(data.error || `HTTP ${res.status}: Request failed`);
        }

        return data;
    } catch (err) {
        throw err;
    }
}

// Verify active session with backend on page load
async function verifySession() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch(API_BASE + "/api/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            clearAllUserSessionData();
            const nav = document.getElementById("mainNavbar");
            if (nav) {
                nav.remove();
                renderCampusNavbar();
            }
        } else if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
                setStoredUser(data.user);
            }
        }
    } catch (e) {
        // Network offline or server starting - retain local state
    }
}

// Show logged-in indicator banner on login and register pages
function checkAlreadyLoggedIn() {
    const user = getStoredUser();
    const token = getAuthToken();
    const container = document.querySelector(".auth-box, .register-box");

    if (user && token && container && !document.getElementById("alreadyLoggedInBanner")) {
        const banner = document.createElement("div");
        banner.id = "alreadyLoggedInBanner";
        banner.className = "auth-logged-in-banner";
        banner.innerHTML = `
            <div>
                <span>👋 Currently signed in as <strong>${escapeHtml(user.name || user.email)}</strong></span>
            </div>
            <div style="display: flex; gap: 8px;">
                <a href="career-hub.html" class="btn-nav-action btn-nav-primary" style="padding: 6px 14px; font-size: 13px;">Dashboard →</a>
                <button type="button" class="btn-nav-action btn-nav-outline" onclick="logoutUser()" style="padding: 6px 14px; font-size: 13px;">Logout</button>
            </div>
        `;
        container.insertBefore(banner, container.firstChild);
    }
}

// ==========================================================
// 1. UNIVERSAL MODAL & OVERLAY SYSTEM
// ==========================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("active");
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("active");
    modal.style.display = "none";

    // If no other modals are active, allow background scrolling
    const activeModals = document.querySelectorAll(".modal-overlay.active, .ai-processing-overlay.active");
    if (activeModals.length === 0) {
        document.body.classList.remove("modal-open");
    }
}

function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => {
        m.classList.remove("active");
        m.style.display = "none";
    });
    closeMobileNav();
    document.body.classList.remove("modal-open");
}

// Global modal listeners: Click outside modal box to close & Escape key to close
document.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal-overlay")) {
        closeModal(e.target.id);
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAllModals();
    }
});

// AI Processing Overlay Helper
function showAiProcessingOverlay(title = "Consulting Groq AI...", subtitle = "Analyzing data...") {
    let overlay = document.getElementById("aiProcessingOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "aiProcessingOverlay";
        overlay.className = "ai-processing-overlay";
        overlay.innerHTML = `
            <div class="ai-processing-spinner-box">
                <div class="ai-spinner-ring"></div>
                <div class="ai-spinner-ring-inner"></div>
                <div class="ai-spinner-icon">⚡</div>
            </div>
            <div class="ai-processing-title" id="aiProcessingTitle">${escapeHtml(title)}</div>
            <div class="ai-processing-subtitle" id="aiProcessingSubtitle">${escapeHtml(subtitle)}</div>
        `;
        document.body.appendChild(overlay);
    } else {
        const titleEl = document.getElementById("aiProcessingTitle");
        const subEl = document.getElementById("aiProcessingSubtitle");
        if (titleEl) titleEl.innerText = title;
        if (subEl) subEl.innerText = subtitle;
    }

    overlay.classList.add("active");
    document.body.classList.add("modal-open");
}

function hideAiProcessingOverlay() {
    const overlay = document.getElementById("aiProcessingOverlay");
    if (overlay) {
        overlay.classList.remove("active");
        overlay.style.display = "none";
    }
    const activeModals = document.querySelectorAll(".modal-overlay.active");
    if (activeModals.length === 0) {
        document.body.classList.remove("modal-open");
    }
}

// Mobile Navigation Drawer Overlay
function toggleMobileNav() {
    const overlay = document.getElementById("mobileNavOverlay");
    const drawer = document.getElementById("mobileNavDrawer");
    if (!overlay || !drawer) return;

    const isActive = overlay.classList.contains("active");
    if (isActive) {
        closeMobileNav();
    } else {
        overlay.classList.add("active");
        drawer.classList.add("active");
        document.body.classList.add("modal-open");
    }
}

function closeMobileNav() {
    const overlay = document.getElementById("mobileNavOverlay");
    const drawer = document.getElementById("mobileNavDrawer");
    if (overlay) overlay.classList.remove("active");
    if (drawer) drawer.classList.remove("active");
    const activeModals = document.querySelectorAll(".modal-overlay.active");
    if (activeModals.length === 0) {
        document.body.classList.remove("modal-open");
    }
}

// ==========================================================
// 2. AUTHENTICATION (REGISTER & LOGIN & LOGOUT)
// ==========================================================

async function registerUser() {
    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const submitBtn = document.querySelector(".register-box button[type='submit'], .register-box button");

    if (!nameInput || !emailInput || !passwordInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    if (!name || !email || !password) {
        showToast("Please fill in all registration fields.", "error");
        return;
    }

    if (!email.includes("@") || !email.includes(".")) {
        showToast("Please enter a valid email address.", "error");
        return;
    }

    if (password.length < 6) {
        showToast("Password should be at least 6 characters long.", "error");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Creating Account...";
        }

        const res = await apiFetch("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        setAuthToken(res.token);
        setStoredUser(res.user);
        localStorage.removeItem("campusai_profile_completed");
        localStorage.setItem("studentName", res.user.name);

        showToast("Account created! Please complete your required registration details. 📝", "success");

        setTimeout(() => {
            window.location.href = "student.html?mandatory=true";
        }, 700);
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Create Account & Setup Profile →";
        }
    }
}

async function loginUser() {
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const submitBtn = document.querySelector(".auth-box button[type='submit'], .auth-box button");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showToast("Please enter your email and password.", "error");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Logging in...";
        }

        const res = await apiFetch("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        setAuthToken(res.token);
        setStoredUser(res.user);

        // Check if user has complete required profile details
        const profile = res.profile;
        const isComplete = (profile && profile.college && profile.course && profile.year && profile.skills && profile.targetRole &&
            profile.college.trim() !== "" && profile.course.trim() !== "" && profile.year.trim() !== "" && profile.skills.trim() !== "");

        if (isComplete) {
            localStorage.setItem("campusai_profile_completed", "true");
            localStorage.setItem("studentName", profile.fullName || res.user.name);
            localStorage.setItem("studentCollege", profile.college);
            localStorage.setItem("studentCourse", profile.course);
            localStorage.setItem("studentYear", profile.year);
            localStorage.setItem("studentRole", profile.targetRole);
            localStorage.setItem("studentSkills", profile.skills);
            localStorage.setItem("studentPlace", profile.placeOfInterest || "");
        } else {
            localStorage.removeItem("campusai_profile_completed");
            if (profile && profile.fullName) {
                localStorage.setItem("studentName", profile.fullName);
            } else if (res.user && res.user.name) {
                localStorage.setItem("studentName", res.user.name);
            }
        }

        if (isComplete) {
            showToast("Login successful! Welcome back. 🎉", "success");
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTarget = urlParams.get("redirect") || "career-hub.html";
            setTimeout(() => {
                window.location.href = redirectTarget;
            }, 600);
        } else {
            showToast("Login successful! Please complete your required profile details to continue. 📝", "info");
            setTimeout(() => {
                window.location.href = "student.html?mandatory=true";
            }, 700);
        }
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Login to CampusAI →";
        }
    }
}

// Prompt for quick Supabase credentials setup
function promptSupabaseKeys() {
    const currentUrl = localStorage.getItem("custom_supabase_url") || "";
    const currentKey = localStorage.getItem("custom_supabase_anon_key") || "";

    const url = prompt(
        "⚡ Connect Supabase & Google Sign-In\n\nEnter your Supabase Project URL (e.g., https://yourproject.supabase.co):",
        currentUrl
    );
    if (!url) return;

    const key = prompt(
        "Enter your Supabase 'anon public' API Key:",
        currentKey
    );
    if (!key) return;

    localStorage.setItem("custom_supabase_url", url.trim());
    localStorage.setItem("custom_supabase_anon_key", key.trim());

    if (window.CAMPUS_AI_SUPABASE_CONFIG) {
        window.CAMPUS_AI_SUPABASE_CONFIG.url = url.trim();
        window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = key.trim();
    }

    showToast("Supabase keys saved! Initializing Google Auth...", "success");
    setTimeout(() => {
        window.location.reload();
    }, 800);
}

function quickDemoLogin() {
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    if (emailInput && passwordInput) {
        emailInput.value = "demo@campusai.com";
        passwordInput.value = "password123";
        loginUser();
    }
}

function logoutUser() {
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearAllUserSessionData();
    showToast("Logged out successfully.", "info");
    setTimeout(() => {
        window.location.href = "login.html";
    }, 400);
}

// ==========================================================
// 3. GLOBAL NAVBAR & MOBILE DRAWER
// ==========================================================

function renderCampusNavbar() {
    if (document.getElementById("mainNavbar")) return;

    const nav = document.createElement("nav");
    nav.id = "mainNavbar";
    nav.className = "campus-navbar";

    const user = getStoredUser();
    const currentPath = window.location.pathname;

    nav.innerHTML = `
        <div class="nav-container">
            <a href="index.html" class="nav-brand">
                <div class="nav-brand-logo">🎓</div>
                <span>CampusAI</span>
                <span class="nav-brand-tag">AI 2.0</span>
            </a>

            ${user ? (isProfileCompleted() ? `
                <ul class="nav-menu">
                    <li><a href="index.html" class="nav-link ${currentPath.endsWith('index.html') || currentPath === '/' ? 'active' : ''}">🏠 Home</a></li>
                    <li><a href="career-hub.html" class="nav-link ${currentPath.endsWith('career-hub.html') ? 'active' : ''}">🤖 AI Career Hub</a></li>
                    <li><a href="opportunities.html" class="nav-link ${currentPath.endsWith('opportunities.html') || currentPath.endsWith('opportunity-details.html') ? 'active' : ''}">🚀 Opportunities</a></li>
                    <li><a href="student.html" class="nav-link ${currentPath.endsWith('student.html') ? 'active' : ''}">🎓 Student Profile</a></li>
                </ul>
            ` : `
                <ul class="nav-menu">
                    <li><span class="nav-link active" style="color: #ea580c; font-weight: 700; background: #fff7ed; padding: 6px 14px; border-radius: 8px; border: 1px solid #fed7aa;">⚠️ Complete Student Details (Required)</span></li>
                </ul>
            `) : `
                <ul class="nav-menu">
                    <li><span class="nav-link" style="color: #888; font-size: 13px;">🔒 Log in to access campus opportunities &amp; AI tools</span></li>
                </ul>
            `}

            <div class="nav-actions">
                <div class="groq-status-badge" id="groqBadge" title="Groq AI Engine Status (Managed via Server .env)">
                    <span class="status-dot" id="groqStatusDot"></span>
                    <span id="groqStatusText">AI Ready</span>
                </div>

                ${user ? `
                    <div class="user-nav-pill">
                        <div class="user-nav-avatar">${escapeHtml((user.name || 'S')[0].toUpperCase())}</div>
                        <span>${escapeHtml((user.name || 'Student').split(' ')[0])}</span>
                    </div>
                    <button type="button" class="btn-nav-action btn-nav-outline" onclick="logoutUser()">Logout</button>
                ` : `
                    <button type="button" class="btn-nav-action btn-nav-outline" onclick="window.location.href='login.html'">Login</button>
                    <button type="button" class="btn-nav-action btn-nav-primary" onclick="window.location.href='register.html'">Register</button>
                `}

                <button type="button" class="mobile-menu-toggle" onclick="toggleMobileNav()" aria-label="Toggle Navigation Menu">
                    ☰
                </button>
            </div>
        </div>
    `;

    document.body.insertBefore(nav, document.body.firstChild);
    injectMobileNavDrawer();
    checkGroqStatus();
}

function injectMobileNavDrawer() {
    if (document.getElementById("mobileNavOverlay")) return;

    const user = getStoredUser();
    const currentPath = window.location.pathname;

    const overlay = document.createElement("div");
    overlay.id = "mobileNavOverlay";
    overlay.className = "mobile-nav-overlay";
    overlay.onclick = closeMobileNav;

    const drawer = document.createElement("div");
    drawer.id = "mobileNavDrawer";
    drawer.className = "mobile-nav-drawer";
    drawer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f0eeff; padding-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:22px;">🎓</span>
                <span style="font-weight:800; font-size:18px;">CampusAI</span>
            </div>
            <button class="modal-close-btn" onclick="closeMobileNav()">✕</button>
        </div>

        ${user ? (isProfileCompleted() ? `
            <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                <li><a href="index.html" class="nav-link ${currentPath.endsWith('index.html') || currentPath === '/' ? 'active' : ''}">🏠 Home</a></li>
                <li><a href="career-hub.html" class="nav-link ${currentPath.endsWith('career-hub.html') ? 'active' : ''}">🤖 AI Career Hub</a></li>
                <li><a href="opportunities.html" class="nav-link ${currentPath.endsWith('opportunities.html') ? 'active' : ''}">🚀 Opportunities</a></li>
                <li><a href="student.html" class="nav-link ${currentPath.endsWith('student.html') ? 'active' : ''}">🎓 Student Profile</a></li>
            </ul>
        ` : `
            <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                <li><span class="nav-link active" style="color: #ea580c; font-weight: 700; background: #fff7ed; padding: 8px 12px; border-radius: 8px; border: 1px solid #fed7aa; display: block;">⚠️ Complete Registration (Required)</span></li>
            </ul>
        `) : `
            <div style="padding: 24px 0; color: #777; font-size: 13px; line-height: 1.6;">
                🔒 <strong>Members-Only Access</strong><br>
                Please log in or register to access the AI Career Hub, verified campus hackathons, student profile vault, and course roadmaps.
            </div>
        `}

        <div style="margin-top:auto; padding-top:20px; border-top:1px solid #f0eeff; display:flex; flex-direction:column; gap:10px;">
            ${user ? `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <div class="user-nav-avatar">${escapeHtml((user.name || 'S')[0].toUpperCase())}</div>
                    <div>
                        <div style="font-weight:700; font-size:14px;">${escapeHtml(user.name || 'Student')}</div>
                        <div style="font-size:12px; color:#888;">${escapeHtml(user.email || '')}</div>
                    </div>
                </div>
                <button type="button" class="btn-primary-action" style="margin:0;" onclick="logoutUser()">Logout</button>
            ` : `
                <button type="button" class="btn-primary-action" style="margin:0;" onclick="window.location.href='login.html'">Login</button>
                <button type="button" class="btn-secondary-action" style="margin:0;" onclick="window.location.href='register.html'">Register</button>
            `}
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
}

async function checkGroqStatus() {
    try {
        const res = await apiFetch("/api/config/ai-status");
        const dot = document.getElementById("groqStatusDot");
        const text = document.getElementById("groqStatusText");
        const badge = document.getElementById("groqBadge");

        if (res.groqConnected) {
            if (dot) dot.style.background = "#00b894";
            if (text) text.innerText = "Groq Llama-3.3 ⚡";
            if (badge) badge.title = `Groq AI Active & Accelerated via server .env (${res.model})`;
        } else {
            if (dot) dot.style.background = "#6c5ce7";
            if (text) text.innerText = "CampusAI Core 🧠";
            if (badge) badge.title = "CampusAI Intelligent Engine (Live in server .env)";
        }
    } catch (e) {
        console.warn("AI Status check:", e);
    }
}

// ==========================================================
// 4. STUDENT PROFILE & PREFERENCES (student.html)
// ==========================================================

async function loadStudentProfile() {
    const nameInput = document.getElementById("studentName");
    if (!nameInput) return; // Only run on student.html

    const collegeInput = document.getElementById("studentCollege");
    const courseInput = document.getElementById("studentCourse");
    const yearInput = document.getElementById("studentYear");
    const gpaInput = document.getElementById("studentGpa");
    const placeInput = document.getElementById("studentPlace");
    const roleInput = document.getElementById("studentRole");
    const skillsInput = document.getElementById("studentSkills");
    const interestsInput = document.getElementById("studentInterests");
    const goalsInput = document.getElementById("studentGoals");

    const user = getStoredUser();
    const token = getAuthToken();

    // Fast pre-fill from localStorage
    if (nameInput) nameInput.value = localStorage.getItem("studentName") || (user ? user.name : "");
    if (collegeInput) collegeInput.value = localStorage.getItem("studentCollege") || "";
    if (courseInput) courseInput.value = localStorage.getItem("studentCourse") || "";
    if (yearInput && localStorage.getItem("studentYear")) yearInput.value = localStorage.getItem("studentYear");
    if (placeInput) placeInput.value = localStorage.getItem("studentPlace") || "Bangalore / Remote";
    if (roleInput) roleInput.value = localStorage.getItem("studentRole") || "AI / Software Engineer";
    if (skillsInput) skillsInput.value = localStorage.getItem("studentSkills") || "";

    // Check if in mandatory onboarding mode
    const urlParams = new URLSearchParams(window.location.search);
    const isMandatory = urlParams.get("mandatory") === "true" || !isProfileCompleted();
    const noticeEl = document.getElementById("mandatoryNotice");
    if (noticeEl && isMandatory) {
        noticeEl.style.display = "flex";
        noticeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (token) {
        try {
            const profile = await apiFetch("/api/profile");
            if (profile) {
                if (nameInput) nameInput.value = profile.fullName || (user ? user.name : "");
                if (collegeInput) collegeInput.value = profile.college || "";
                if (courseInput) courseInput.value = profile.course || "";
                if (yearInput && profile.year) yearInput.value = profile.year;
                if (gpaInput) gpaInput.value = profile.gpa || "";
                if (placeInput) placeInput.value = profile.placeOfInterest || "Bangalore / Remote";
                if (roleInput) roleInput.value = profile.targetRole || "AI / Software Engineer";
                if (skillsInput) skillsInput.value = profile.skills || "";
                if (interestsInput) interestsInput.value = profile.interests || "";
                if (goalsInput) goalsInput.value = profile.careerGoals || "";

                // Sync to localStorage
                localStorage.setItem("studentName", profile.fullName || "");
                localStorage.setItem("studentCollege", profile.college || "");
                localStorage.setItem("studentCourse", profile.course || "");
                localStorage.setItem("studentYear", profile.year || "");
                localStorage.setItem("studentSkills", profile.skills || "");
                localStorage.setItem("studentPlace", profile.placeOfInterest || "");
                localStorage.setItem("studentRole", profile.targetRole || "");
            }
        } catch (err) {
            console.warn("Could not fetch remote profile:", err.message);
        }
    }
}

async function saveStudentDetails() {
    const fullName = document.getElementById("studentName") ? document.getElementById("studentName").value.trim() : "";
    const college = document.getElementById("studentCollege") ? document.getElementById("studentCollege").value.trim() : "";
    const course = document.getElementById("studentCourse") ? document.getElementById("studentCourse").value.trim() : "";
    const year = document.getElementById("studentYear") ? document.getElementById("studentYear").value.trim() : "";
    const gpa = document.getElementById("studentGpa") ? document.getElementById("studentGpa").value.trim() : "";
    const placeOfInterest = document.getElementById("studentPlace") ? document.getElementById("studentPlace").value.trim() : "Bangalore / Remote";
    const targetRole = document.getElementById("studentRole") ? document.getElementById("studentRole").value.trim() : "";
    const skills = document.getElementById("studentSkills") ? document.getElementById("studentSkills").value.trim() : "";
    const interests = document.getElementById("studentInterests") ? document.getElementById("studentInterests").value.trim() : "";
    const careerGoals = document.getElementById("studentGoals") ? document.getElementById("studentGoals").value.trim() : "";

    // Strict validation: Mandatory fields cannot be skipped
    if (!fullName) {
        showToast("Full Name is required.", "error");
        document.getElementById("studentName")?.focus();
        return;
    }
    if (!college) {
        showToast("College / University Name is required.", "error");
        document.getElementById("studentCollege")?.focus();
        return;
    }
    if (!course) {
        showToast("Degree & Branch / Major is required.", "error");
        document.getElementById("studentCourse")?.focus();
        return;
    }
    if (!year) {
        showToast("Current Year is required.", "error");
        document.getElementById("studentYear")?.focus();
        return;
    }
    if (!targetRole) {
        showToast("Target Dream Career Role is required.", "error");
        document.getElementById("studentRole")?.focus();
        return;
    }
    if (!skills) {
        showToast("Current Technical Skills are required.", "error");
        document.getElementById("studentSkills")?.focus();
        return;
    }
    if (!placeOfInterest) {
        showToast("Target City / Place of Interest is required.", "error");
        document.getElementById("studentPlace")?.focus();
        return;
    }

    const payload = {
        fullName,
        college,
        course,
        year,
        gpa,
        placeOfInterest,
        targetRole,
        skills,
        interests,
        careerGoals
    };

    // Cache locally & mark profile as completed
    localStorage.setItem("studentName", fullName);
    localStorage.setItem("studentCollege", college);
    localStorage.setItem("studentCourse", course);
    localStorage.setItem("studentYear", year);
    localStorage.setItem("studentSkills", skills);
    localStorage.setItem("studentPlace", placeOfInterest);
    localStorage.setItem("studentRole", targetRole);
    localStorage.setItem("campusai_profile_completed", "true");

    const token = getAuthToken();
    if (token) {
        try {
            await apiFetch("/api/profile", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.warn("Backend profile save:", err);
        }
    }

    // Sync to Supabase user if logged in via Supabase
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.auth.updateUser({
                data: {
                    fullName,
                    college,
                    course,
                    year,
                    targetRole,
                    skills,
                    placeOfInterest
                }
            });
        } catch (sbErr) {
            console.warn("Supabase user profile update:", sbErr);
        }
    }

    showToast("Profile registration completed successfully! 🎓 Welcome to CampusAI.", "success");

    setTimeout(() => {
        window.location.href = "career-hub.html";
    }, 700);
}

// --- ACHIEVEMENTS / PROOF VAULT OVERLAY MODAL ---
let currentVaultUploadType = "Certification";

function openUpload(type) {
    currentVaultUploadType = type || "Certification";
    const title = document.getElementById("uploadTitle");
    if (title) title.innerText = "🏆 Upload " + currentVaultUploadType + " Proof";
    openModal("uploadModal");
}

function closeUploadModal() {
    closeModal("uploadModal");
}

async function loadAchievements() {
    const listEl = document.getElementById("achievementList");
    const hackEl = document.getElementById("hackathonCount");
    const certEl = document.getElementById("certificateCount");
    const projEl = document.getElementById("projectCount");
    const workEl = document.getElementById("workshopCount");
    const levelEl = document.getElementById("studentLevel");

    if (!listEl && !hackEl) return;

    let items = [];
    const token = getAuthToken();

    if (token) {
        try {
            items = await apiFetch("/api/achievements");
        } catch (e) {
            items = JSON.parse(localStorage.getItem("campusai_achievements") || "[]");
        }
    } else {
        items = JSON.parse(localStorage.getItem("campusai_achievements") || "[]");
    }

    const hacks = items.filter(a => a.type === "Hackathon").length;
    const certs = items.filter(a => a.type === "Certification").length;
    const projs = items.filter(a => a.type === "Project").length;
    const works = items.filter(a => a.type === "Workshop" || a.type === "Internship").length;

    if (hackEl) hackEl.innerText = hacks;
    if (certEl) certEl.innerText = certs;
    if (projEl) projEl.innerText = projs;
    if (workEl) workEl.innerText = works;

    if (levelEl) {
        const total = items.length;
        if (total >= 4) levelEl.innerText = "Master Builder 🌟";
        else if (total >= 2) levelEl.innerText = "Campus Innovator 🔥";
        else levelEl.innerText = "Tech Explorer 🚀";
    }

    if (listEl) {
        if (items.length === 0) {
            listEl.innerHTML = `<p style="color: #777; font-size: 14px; padding: 20px 0; text-align: center;">No achievements added yet. Click one of the buttons above to upload your first proof!</p>`;
        } else {
            listEl.innerHTML = items.map(ach => `
                <div class="achievement-item">
                    <div class="achievement-item-info">
                        <h4>${escapeHtml(ach.name)}</h4>
                        <p>🏛️ ${escapeHtml(ach.organization)} &nbsp;|&nbsp; 📅 ${escapeHtml(ach.year)}</p>
                        <span class="achievement-item-badge">${escapeHtml(ach.type)}</span>
                    </div>
                    <button type="button" class="achievement-delete-btn" onclick="deleteAchievementItem('${ach.id}')">Delete</button>
                </div>
            `).join("");
        }
    }
}

async function saveAchievement() {
    const nameInput = document.getElementById("achievementName");
    const orgInput = document.getElementById("organization");
    const yearInput = document.getElementById("achievementYear");
    const fileInput = document.getElementById("achievementFile");

    if (!nameInput || !orgInput || !yearInput) return;

    const name = nameInput.value.trim();
    const organization = orgInput.value.trim();
    const year = yearInput.value.trim();
    const fileName = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0].name : "Proof_Document.pdf";

    if (!name || !organization || !year) {
        showToast("Please fill in achievement name, organization, and year.", "error");
        return;
    }

    const item = {
        type: currentVaultUploadType,
        name,
        organization,
        year,
        fileName
    };

    const token = getAuthToken();
    if (token) {
        try {
            await apiFetch("/api/achievements", {
                method: "POST",
                body: JSON.stringify(item)
            });
            showToast("Achievement uploaded and verified! 🏆", "success");
        } catch (err) {
            showToast(err.message, "error");
        }
    } else {
        const local = JSON.parse(localStorage.getItem("campusai_achievements") || "[]");
        local.push({ ...item, id: Date.now() });
        localStorage.setItem("campusai_achievements", JSON.stringify(local));
        showToast("Achievement saved locally! 🏆", "success");
    }

    // Reset inputs
    nameInput.value = "";
    orgInput.value = "";
    yearInput.value = "";
    if (fileInput) fileInput.value = "";

    closeUploadModal();
    loadAchievements();
}

async function deleteAchievementItem(id) {
    const token = getAuthToken();
    if (token) {
        try {
            await apiFetch(`/api/achievements/${id}`, { method: "DELETE" });
            showToast("Achievement deleted.", "info");
        } catch (err) {
            showToast(err.message, "error");
        }
    } else {
        let local = JSON.parse(localStorage.getItem("campusai_achievements") || "[]");
        local = local.filter(a => String(a.id) !== String(id));
        localStorage.setItem("campusai_achievements", JSON.stringify(local));
        showToast("Achievement removed.", "info");
    }
    loadAchievements();
}

// ==========================================================
// 5. GROQ AI CAREER & STUDY HUB (career-hub.html)
// ==========================================================

function switchHubTab(tabId) {
    document.querySelectorAll(".hub-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".hub-pane").forEach(p => p.classList.remove("active"));

    const btn = document.querySelector(`.hub-tab[data-tab="${tabId}"]`);
    const pane = document.getElementById(`tab-${tabId}`);

    if (btn) btn.classList.add("active");
    if (pane) pane.classList.add("active");

    if (tabId === "jobs") loadOpportunitiesInHub();
    if (tabId === "showcase") loadProjects();
}

// Main Groq AI Study & Career Generator
async function generateAiCareerGuidance() {
    const courseInput = document.getElementById("guideCourse");
    const yearInput = document.getElementById("guideYear");
    const placeInput = document.getElementById("guidePlace");
    const roleInput = document.getElementById("guideRole");
    const skillsInput = document.getElementById("guideSkills");
    const focusInput = document.getElementById("guideFocus");
    const btn = document.getElementById("btnGenerateGuidance");
    const outputContainer = document.getElementById("aiOutputContainer");

    const payload = {
        course: courseInput ? courseInput.value.trim() : (localStorage.getItem("studentCourse") || "Computer Science"),
        year: yearInput ? yearInput.value.trim() : "3rd Year",
        placeOfInterest: placeInput ? placeInput.value.trim() : (localStorage.getItem("studentPlace") || "Bangalore, India"),
        targetRole: roleInput ? roleInput.value.trim() : (localStorage.getItem("studentRole") || "AI / Software Engineer"),
        skills: skillsInput ? skillsInput.value.trim() : (localStorage.getItem("studentSkills") || "Python, C++, Web Development"),
        focusTopic: focusInput ? focusInput.value.trim() : ""
    };

    showAiProcessingOverlay(
        "⚡ Generating AI Career Roadmap...",
        `Tailoring curriculum and market insights for ${escapeHtml(payload.targetRole)} in ${escapeHtml(payload.placeOfInterest)}.`
    );

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `⚡ Consulting Groq AI (Llama 3.3)...`;
        }

        const res = await apiFetch("/api/ai/career-guidance", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const g = res.guidance;
        if (!g) throw new Error("Could not parse guidance data.");

        renderGuidanceResults(g);

        if (outputContainer) {
            outputContainer.style.display = "block";
            outputContainer.scrollIntoView({ behavior: "smooth" });
        }

        showToast("Career & Study Roadmap ready! 🚀", "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        hideAiProcessingOverlay();
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `✨ Generate AI Study Plan &amp; Roadmap`;
        }
    }
}

function renderGuidanceResults(g) {
    const sourceEl = document.getElementById("aiSourceBadge");
    const summaryEl = document.getElementById("aiExecutiveSummary");
    const studyGrid = document.getElementById("aiWhatToStudyGrid");
    const coursesGrid = document.getElementById("aiCoursesGrid");
    const roadmapEl = document.getElementById("aiRoadmapTimeline");
    const locationEl = document.getElementById("aiLocationInsights");
    const projectsEl = document.getElementById("aiRecommendedProjects");

    if (sourceEl) sourceEl.innerHTML = `⚡ ${escapeHtml(g.source || "CampusAI Engine")}`;
    if (summaryEl) summaryEl.innerHTML = `<p>${escapeHtml(g.executiveSummary)}</p>`;

    // What to study
    if (studyGrid && Array.isArray(g.whatToStudy)) {
        studyGrid.innerHTML = g.whatToStudy.map(s => `
            <div class="study-card">
                <h4>${escapeHtml(s.subject)}</h4>
                <span class="importance-pill">${escapeHtml(s.importance || "High Priority")}</span>
                <ul class="study-topics-list">
                    ${(s.topics || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}
                </ul>
            </div>
        `).join("");
    }

    // Recommended courses
    if (coursesGrid && Array.isArray(g.recommendedCourses)) {
        coursesGrid.innerHTML = g.recommendedCourses.map(c => `
            <div class="course-card">
                <div class="course-card-top">
                    <div class="course-card-badges">
                        <span class="badge-platform">🎓 ${escapeHtml(c.platform || "Online Course")}</span>
                        <span class="badge-duration">⏱️ ${escapeHtml(c.duration || "Self-Paced")}</span>
                        <span class="badge-level">⭐ ${escapeHtml(c.level || "Intermediate")}</span>
                    </div>
                    <h4>${escapeHtml(c.title)}</h4>
                    <p>${escapeHtml(c.whyStudy || "")}</p>
                </div>
            </div>
        `).join("");
    }

    // Roadmap
    if (roadmapEl && Array.isArray(g.studyRoadmap)) {
        roadmapEl.innerHTML = g.studyRoadmap.map(r => `
            <div class="roadmap-phase-card">
                <h4>${escapeHtml(r.phase)}</h4>
                <ul class="roadmap-milestones">
                    ${(r.milestones || []).map(m => `<li>${escapeHtml(m)}</li>`).join("")}
                </ul>
            </div>
        `).join("");
    }

    // Location Insights
    if (locationEl && g.locationInsights) {
        const loc = g.locationInsights;
        locationEl.innerHTML = `
            <h3>📍 Target Location Dynamics: ${escapeHtml(loc.hub || g.placeOfInterest || "Tech Hub")}</h3>
            <p style="color: #555; line-height: 1.6; margin-bottom: 12px;">${escapeHtml(loc.hiringTrends || "")}</p>
            <div class="market-pills">
                ${(loc.topSoughtSkills || []).map(sk => `<span class="market-pill">🎯 ${escapeHtml(sk)}</span>`).join("")}
            </div>
            ${loc.localNetworkingTips ? `<p style="margin-top: 14px; font-size: 13px; color: #6c5ce7; font-weight: 600;">💡 Pro Tip: ${escapeHtml(loc.localNetworkingTips)}</p>` : ""}
        `;
    }

    // Recommended Projects
    if (projectsEl && Array.isArray(g.recommendedProjects)) {
        projectsEl.innerHTML = g.recommendedProjects.map(p => `
            <div class="project-card" style="margin-bottom: 14px;">
                <h4>🛠️ ${escapeHtml(p.title)}</h4>
                <p style="color: #666; font-size: 14px; margin: 8px 0;">${escapeHtml(p.description)}</p>
                <div class="project-tags">
                    ${(p.techStack || []).map(t => `<span class="project-tag">${escapeHtml(t)}</span>`).join("")}
                </div>
            </div>
        `).join("");
    }
}

// Chat with AI Career Coach
let chatHistory = [];

async function sendCareerChatMessage() {
    const input = document.getElementById("chatInput");
    const container = document.getElementById("chatMessages");
    if (!input || !container) return;

    const message = input.value.trim();
    if (!message) return;

    // Append user message
    chatHistory.push({ role: "user", content: message });
    container.innerHTML += `
        <div class="chat-bubble user">${escapeHtml(message)}</div>
    `;
    input.value = "";
    container.scrollTop = container.scrollHeight;

    // Show typing placeholder
    const typingId = "typing-" + Date.now();
    container.innerHTML += `
        <div class="chat-bubble ai" id="${typingId}"><em>Thinking with Groq AI...</em></div>
    `;
    container.scrollTop = container.scrollHeight;

    try {
        const res = await apiFetch("/api/ai/chat", {
            method: "POST",
            body: JSON.stringify({ messages: chatHistory })
        });

        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        const reply = res.reply || "I'm here to help guide your studies and career!";
        chatHistory.push({ role: "assistant", content: reply });

        container.innerHTML += `
            <div class="chat-bubble ai">${formatMarkdown(reply)}</div>
        `;
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.innerText = "Error: " + err.message;
    }
}

// Resume Scorer
async function scoreResumeWithAi() {
    const roleSelect = document.getElementById("targetRole");
    const resumeText = document.getElementById("resumeText");
    const btn = document.getElementById("btnScoreResume");
    const resultPanel = document.getElementById("scoreResultPanel");

    const role = roleSelect ? roleSelect.value : "Machine Learning Engineer";
    const text = resumeText ? resumeText.value.trim() : "";

    if (!text) {
        showToast("Please paste your resume text or project summaries.", "error");
        return;
    }

    showAiProcessingOverlay("📄 Benchmarking Resume with AI...", "Analyzing technical depth, alignment with " + role + ", and ATS recruiter criteria.");

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Analyzing with Groq AI...";
        }

        const res = await apiFetch("/api/ai/resume-score", {
            method: "POST",
            body: JSON.stringify({ resumeText: text, targetRole: role })
        });

        const numEl = document.getElementById("scoreNumber");
        const summaryEl = document.getElementById("scoreSummary");
        const strengthsEl = document.getElementById("scoreStrengths");
        const missingEl = document.getElementById("scoreMissing");
        const actionEl = document.getElementById("scoreActions");

        if (numEl) numEl.innerText = res.score + "/100";
        if (summaryEl) summaryEl.innerText = res.summary || "";

        if (strengthsEl && Array.isArray(res.strengths)) {
            strengthsEl.innerHTML = res.strengths.map(s => `<div class="feedback-item">✓ ${escapeHtml(s)}</div>`).join("");
        }
        if (missingEl && Array.isArray(res.missingSkills)) {
            missingEl.innerHTML = res.missingSkills.map(m => `<span class="keyword-pill missing">+ ${escapeHtml(m)}</span>`).join(" ");
        }
        if (actionEl && Array.isArray(res.actionItems)) {
            actionEl.innerHTML = res.actionItems.map(a => `<div class="feedback-item" style="border-left-color: #00cec9;">📌 ${escapeHtml(a)}</div>`).join("");
        }

        if (resultPanel) {
            resultPanel.style.display = "block";
            resultPanel.scrollIntoView({ behavior: "smooth" });
        }

        showToast("Resume scored: " + res.score + "/100 📄", "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        hideAiProcessingOverlay();
        if (btn) {
            btn.disabled = false;
            btn.innerText = "⚡ Benchmark My Resume with Groq AI";
        }
    }
}

// Project Showcase
async function loadProjects(category = "All") {
    const grid = document.getElementById("projectGrid");
    if (!grid) return;

    try {
        const query = category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
        const projects = await apiFetch(`/api/projects${query}`);

        if (!projects || projects.length === 0) {
            grid.innerHTML = `<p style="color: #777; grid-column: span 2; text-align: center; padding: 30px;">No projects published in this category yet. Be the first to publish!</p>`;
            return;
        }

        grid.innerHTML = projects.map(p => `
            <div class="project-card">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <span class="card-category-badge">${escapeHtml(p.category)}</span>
                        <small style="color: #888;">By ${escapeHtml(p.authorName || "Student")}</small>
                    </div>
                    <h3 style="font-size: 18px; margin-bottom: 8px;">${escapeHtml(p.title)}</h3>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">${escapeHtml(p.description)}</p>
                </div>
                <div>
                    <div class="project-tags">
                        ${(p.tags || []).map(t => `<span class="project-tag">#${escapeHtml(t)}</span>`).join("")}
                    </div>
                    <div class="project-links">
                        ${p.demoUrl ? `<a href="${encodeURI(p.demoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn">🚀 Live Demo</a>` : ""}
                        ${p.githubUrl ? `<a href="${encodeURI(p.githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link-btn">💻 GitHub</a>` : ""}
                    </div>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.warn("Could not load projects:", err);
    }
}

function filterProjects(cat, btn) {
    document.querySelectorAll("#projectFilters .filter-pill").forEach(p => p.classList.remove("active"));
    if (btn) {
        btn.classList.add("active");
    } else if (typeof event !== "undefined" && event && event.target) {
        event.target.classList.add("active");
    }
    loadProjects(cat);
}

function openPublishModal() {
    openModal("publishProjectModal");
}

function closePublishModal() {
    closeModal("publishProjectModal");
}

async function publishProject() {
    const titleInput = document.getElementById("projTitle");
    const descInput = document.getElementById("projDesc");
    const catSelect = document.getElementById("projCategory");
    const tagsInput = document.getElementById("projTags");
    const demoInput = document.getElementById("projDemo");
    const githubInput = document.getElementById("projGithub");

    if (!titleInput || !descInput) return;

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const category = catSelect ? catSelect.value : "Generative AI";
    const tags = tagsInput ? tagsInput.value.split(",").map(t => t.trim()).filter(Boolean) : [];
    const demoUrl = demoInput ? demoInput.value.trim() : "";
    const githubUrl = githubInput ? githubInput.value.trim() : "";

    if (!title || !description) {
        showToast("Please enter project title and description.", "error");
        return;
    }

    try {
        await apiFetch("/api/projects", {
            method: "POST",
            body: JSON.stringify({ title, description, category, tags, demoUrl, githubUrl })
        });
        showToast("Project published to showcase! 🎨", "success");
        closePublishModal();
        loadProjects();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ==========================================================
// 6. OPPORTUNITIES & QUICK VIEW OVERLAY MODAL
// ==========================================================

async function loadOpportunities() {
    const cards = document.getElementById("opportunityCards");
    const title = document.getElementById("categoryTitle");
    const searchInput = document.getElementById("opportunitySearch");
    if (!cards) return;

    const querySearch = searchInput ? searchInput.value.trim() : "";
    const selectedCategory = localStorage.getItem("selectedInterest") || "All";

    if (title) {
        title.innerHTML = selectedCategory === "All" ? "🚀 Featured Campus Opportunities" : `🎯 ${escapeHtml(selectedCategory)} Opportunities`;
    }

    try {
        let url = `/api/opportunities?category=${encodeURIComponent(selectedCategory)}`;
        if (querySearch) url += `&search=${encodeURIComponent(querySearch)}`;

        const items = await apiFetch(url);

        if (!items || items.length === 0) {
            cards.innerHTML = `<p style="grid-column: span 2; text-align: center; padding: 40px; color: #777;">No opportunities found matching your criteria. Try searching for other keywords.</p>`;
            return;
        }

        cards.innerHTML = items.map(opp => `
            <div class="card">
                <div>
                    <div class="card-header-row">
                        <div class="icon">${escapeHtml(opp.icon || "🚀")}</div>
                        <span class="card-category-badge">${escapeHtml(opp.category)}</span>
                    </div>
                    <h3>${escapeHtml(opp.title)}</h3>
                    <p>${escapeHtml(opp.description)}</p>
                    <div class="card-meta-row">
                        <span>🏢 ${escapeHtml(opp.organization)}</span>
                        <span>📍 ${escapeHtml(opp.location || "Online")}</span>
                        <span>💰 ${escapeHtml(opp.stipend || "Stipend")}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 18px;">
                    <button type="button" class="btn-nav-action btn-nav-outline" style="flex: 1; padding: 10px; font-size: 13px; margin: 0;" onclick="openOpportunityQuickModal('${opp.id}')">
                        👁️ Quick View
                    </button>
                    <button type="button" class="card-btn" style="flex: 1.2; margin: 0;" onclick="viewOpportunity('${opp.id}')">
                        Details &amp; Apply →
                    </button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.warn("Opportunities error:", err);
    }
}

function loadOpportunitiesInHub() {
    const list = document.getElementById("jobList");
    if (!list) return;

    apiFetch("/api/opportunities").then(items => {
        list.innerHTML = items.map(opp => `
            <div style="background: white; padding: 22px; border-radius: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.04); flex-wrap: wrap;">
                <div>
                    <span class="card-category-badge">${escapeHtml(opp.category)}</span>
                    <h3 style="margin: 8px 0 4px;">${escapeHtml(opp.icon)} ${escapeHtml(opp.title)}</h3>
                    <p style="color: #666; font-size: 14px;">${escapeHtml(opp.organization)} &bull; 📍 ${escapeHtml(opp.location || "Remote")}</p>
                    <small style="color: #00b894; font-weight: bold; margin-top: 4px; display: inline-block;">💰 ${escapeHtml(opp.stipend)}</small>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn-nav-action btn-nav-outline" style="width: auto; padding: 10px 18px; margin: 0;" onclick="openOpportunityQuickModal('${opp.id}')">Quick View</button>
                    <button type="button" class="btn-primary-action" style="width: auto; padding: 10px 22px; margin: 0;" onclick="viewOpportunity('${opp.id}')">Apply Now</button>
                </div>
            </div>
        `).join("");
    }).catch(e => console.warn(e));
}

function selectInterest(type) {
    localStorage.setItem("selectedInterest", type);
    window.location.href = "opportunities.html";
}

function viewOpportunity(id) {
    localStorage.setItem("selectedOpportunityId", id);
    window.location.href = "opportunity-details.html";
}

// Opportunity Quick View Modal Overlay
async function openOpportunityQuickModal(id) {
    let modal = document.getElementById("opportunityQuickModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "opportunityQuickModal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
            <div class="modal-box" style="max-width: 620px;">
                <div class="modal-header">
                    <h3 style="display:flex; align-items:center; gap:8px;">
                        <span id="quickModalIcon">🚀</span>
                        <span id="quickModalHeading">Opportunity Details</span>
                    </h3>
                    <button type="button" class="modal-close-btn" onclick="closeModal('opportunityQuickModal')">✕</button>
                </div>
                <div id="quickModalContent" style="font-size:14px; line-height:1.6; color:#444;">
                    Loading opportunity...
                </div>
                <div style="display:flex; gap:12px; margin-top:24px;">
                    <button type="button" class="btn-primary-action" id="quickModalApplyBtn" style="margin:0; flex:1;">
                        📝 Apply for Opportunity →
                    </button>
                    <button type="button" class="btn-nav-action btn-nav-outline" onclick="closeModal('opportunityQuickModal')" style="margin:0;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    openModal("opportunityQuickModal");

    try {
        const opp = await apiFetch(`/api/opportunities/${id}`);
        const iconEl = document.getElementById("quickModalIcon");
        const headingEl = document.getElementById("quickModalHeading");
        const contentEl = document.getElementById("quickModalContent");
        const applyBtn = document.getElementById("quickModalApplyBtn");

        if (iconEl) iconEl.innerText = opp.icon || "🚀";
        if (headingEl) headingEl.innerText = opp.title;
        if (contentEl) {
            contentEl.innerHTML = `
                <p style="font-size: 15px; color: #333; margin-bottom: 16px;">${escapeHtml(opp.description)}</p>
                <div style="background: #f8f7ff; border: 1px solid var(--primary-border); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>🏢 Organization:</strong><br>${escapeHtml(opp.organization)}</div>
                    <div><strong>💰 Stipend / Grant:</strong><br><span style="color:#00b894; font-weight:bold;">${escapeHtml(opp.stipend)}</span></div>
                    <div><strong>📍 Location:</strong><br>${escapeHtml(opp.mode)} (${escapeHtml(opp.location)})</div>
                    <div><strong>📅 Deadline:</strong><br>${escapeHtml(opp.deadline)}</div>
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>🎓 Eligibility:</strong>
                    <p style="color: #666; margin-top: 4px;">${escapeHtml(opp.eligibility)}</p>
                </div>
                <div>
                    <strong>🛠️ Recommended Skills:</strong>
                    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                        ${(opp.skills || []).map(s => `<span class="project-tag">${escapeHtml(s)}</span>`).join("")}
                    </div>
                </div>
            `;
        }

        if (applyBtn) {
            applyBtn.onclick = () => {
                localStorage.setItem("selectedOpportunityId", opp.id);
                localStorage.setItem("selectedOpportunityTitle", opp.title);
                closeModal("opportunityQuickModal");
                window.location.href = "application.html";
            };
        }
    } catch (e) {
        const contentEl = document.getElementById("quickModalContent");
        if (contentEl) contentEl.innerText = "Error loading details: " + e.message;
    }
}

async function showOpportunityDetails() {
    const titleEl = document.getElementById("detailTitle");
    const descEl = document.getElementById("detailDescription");
    const infoEl = document.getElementById("detailInfo");
    const iconEl = document.getElementById("detailIcon");
    const skillsEl = document.getElementById("detailSkillsBox");

    if (!titleEl && !descEl && !infoEl) return;

    const oppId = localStorage.getItem("selectedOpportunityId") || "opp-1";

    try {
        const opp = await apiFetch(`/api/opportunities/${oppId}`);

        if (iconEl) iconEl.innerText = opp.icon || "🚀";
        if (titleEl) titleEl.innerText = opp.title;
        if (descEl) descEl.innerText = opp.description;

        if (infoEl) {
            infoEl.innerHTML = `
                <p><strong>🏢 Organization:</strong> ${escapeHtml(opp.organization)}</p>
                <p><strong>📋 Eligibility:</strong> ${escapeHtml(opp.eligibility)}</p>
                <p><strong>💰 Reward / Stipend:</strong> ${escapeHtml(opp.stipend)}</p>
                <p><strong>📍 Mode &amp; Location:</strong> ${escapeHtml(opp.mode)} (${escapeHtml(opp.location)})</p>
                <p><strong>📅 Deadline:</strong> ${escapeHtml(opp.deadline)}</p>
            `;
        }

        if (skillsEl && Array.isArray(opp.skills)) {
            skillsEl.innerHTML = `<h3>🛠️ Target Skills You Will Practice</h3>` +
                opp.skills.map(s => `<span>${escapeHtml(s)}</span>`).join(" ");
        }

        localStorage.setItem("selectedOpportunityTitle", opp.title);
    } catch (err) {
        console.warn("Opportunity detail error:", err);
    }
}

function applyForSelectedOpportunity() {
    window.location.href = "application.html";
}

function fillApplicationForm() {
    const appName = document.getElementById("appName");
    if (!appName) return; // Only run on application.html

    const appEmail = document.getElementById("appEmail");
    const appCollege = document.getElementById("appCollege");
    const appSkills = document.getElementById("appSkills");
    const selectedEl = document.getElementById("selectedOpportunity");

    const user = getStoredUser();
    const savedName = localStorage.getItem("studentName") || (user ? user.name : "");
    const savedEmail = localStorage.getItem("userEmail") || (user ? user.email : "");
    const savedCollege = localStorage.getItem("studentCollege") || "";
    const savedSkills = localStorage.getItem("studentSkills") || "";
    const oppTitle = localStorage.getItem("selectedOpportunityTitle") || "AI Innovation Hackathon";

    if (appName && savedName) appName.value = savedName;
    if (appEmail && savedEmail) appEmail.value = savedEmail;
    if (appCollege && savedCollege) appCollege.value = savedCollege;
    if (appSkills && savedSkills) appSkills.value = savedSkills;

    if (selectedEl) {
        selectedEl.innerHTML = `Applying for: <strong>${escapeHtml(oppTitle)}</strong>`;
    }
}

async function submitApplication() {
    const nameInput = document.getElementById("appName");
    const emailInput = document.getElementById("appEmail");
    const collegeInput = document.getElementById("appCollege");
    const skillsInput = document.getElementById("appSkills");
    const noteInput = document.getElementById("appNote");

    const applicantName = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const college = collegeInput ? collegeInput.value.trim() : "";
    const skills = skillsInput ? skillsInput.value.trim() : "";
    const coverNote = noteInput ? noteInput.value.trim() : "";
    const opportunityTitle = localStorage.getItem("selectedOpportunityTitle") || "AI Innovation Hackathon";

    if (!applicantName || !email || !college) {
        showToast("Please fill in your name, email, and college.", "error");
        return;
    }

    showAiProcessingOverlay("Submitting Application...", "Logging profile details with the opportunity host.");

    try {
        await apiFetch("/api/applications", {
            method: "POST",
            body: JSON.stringify({
                opportunityTitle,
                applicantName,
                email,
                college,
                skills,
                coverNote
            })
        });

        localStorage.setItem("applicantName", applicantName);
        window.location.href = "success.html";
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        hideAiProcessingOverlay();
    }
}

function showSuccessMessage() {
    const el = document.getElementById("successName");
    if (!el) return;

    const name = localStorage.getItem("applicantName") || localStorage.getItem("studentName") || "Student";
    const opp = localStorage.getItem("selectedOpportunityTitle") || "Campus Opportunity";
    const oppEl = document.getElementById("successOpportunity");

    if (el) el.innerHTML = `Thank you, <strong>${escapeHtml(name)}</strong>!`;
    if (oppEl) oppEl.innerHTML = `Your application for <strong>${escapeHtml(opp)}</strong> has been registered.`;
}

// Utility Helpers
function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    return html;
}

// ==========================================================
// INITIALIZATION ON PAGE LOAD
// ==========================================================

function initApp() {
    renderCampusNavbar();
    verifySession();
    checkAlreadyLoggedIn();

    // Show login notice if redirected from protected page
    const loginNotice = sessionStorage.getItem("campusai_login_prompt");
    if (loginNotice && (window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("register.html"))) {
        showToast(loginNotice, "info");
        sessionStorage.removeItem("campusai_login_prompt");
    }

    if (document.getElementById("studentName")) {
        loadStudentProfile();
    }
    if (document.getElementById("achievementList") || document.getElementById("hackathonCount")) {
        loadAchievements();
    }
    if (document.getElementById("opportunityCards")) {
        loadOpportunities();
    }
    if (document.getElementById("detailTitle")) {
        showOpportunityDetails();
    }
    if (document.getElementById("appName")) {
        fillApplicationForm();
    }
    if (document.getElementById("successName")) {
        showSuccessMessage();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
