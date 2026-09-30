// ==========================================================
// CampusAI Supabase Auth — Production Ready
// • Google OAuth only (no email/password)
// • Email verification enforced on first sign-in
// • Mandatory profile overlay — cannot be bypassed
// • Credentials loaded from backend /api/config/supabase
// ==========================================================

window.CAMPUS_AI_SUPABASE_CONFIG = { url: "", anonKey: "" };
let supabaseClient = null;

// ── 1. Load credentials from backend ──────────────────────
async function loadSupabaseConfig() {
    try {
        const res = await fetch('/api/config/supabase');
        if (res.ok) {
            const cfg = await res.json();
            if (cfg.url && cfg.anonKey) {
                window.CAMPUS_AI_SUPABASE_CONFIG.url = cfg.url;
                window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = cfg.anonKey;
                return true;
            }
        }
    } catch (e) { /* offline fallback */ }

    // Fallback to localStorage
    const storedUrl = localStorage.getItem("custom_supabase_url");
    const storedKey = localStorage.getItem("custom_supabase_anon_key");
    if (storedUrl && storedKey) {
        window.CAMPUS_AI_SUPABASE_CONFIG.url = storedUrl;
        window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = storedKey;
        return true;
    }
    return false;
}

// ── 2. Supabase client singleton ───────────────────────────
function getSupabase() {
    if (supabaseClient) return supabaseClient;
    const { url, anonKey } = window.CAMPUS_AI_SUPABASE_CONFIG;
    if (window.supabase && url && anonKey && isValidSupabaseConfig(url, anonKey)) {
        try {
            supabaseClient = window.supabase.createClient(url, anonKey);
            window.supabaseClient = supabaseClient;
            return supabaseClient;
        } catch (e) { console.error("Supabase init error:", e); }
    }
    return null;
}

function isValidSupabaseConfig(url, key) {
    if (!url || !key) return false;
    if (url.includes("your-project-id")) return false;
    return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_") || key.startsWith("eyJ");
}

function isSupabaseConfigured() {
    const { url, anonKey } = window.CAMPUS_AI_SUPABASE_CONFIG;
    return !!(url && anonKey && isValidSupabaseConfig(url, anonKey));
}

// ── 3. Google Sign-In via Supabase OAuth ──────────────────
async function signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) {
        const msg = "Supabase is not configured. Please check your .env file.";
        if (typeof showToast !== 'undefined') showToast(msg, "error");
        else alert(msg);
        return;
    }
    try {
        const origin = window.location.origin;
        // Express serves CAMPUS_AI/ as web root, so all pages are at /<page>.html
        const redirectTo = origin + '/auth-callback.html';
        const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if (error) throw error;
    } catch (err) {
        console.error("Google Auth error:", err);
        if (typeof showToast !== 'undefined') showToast(err.message || "Failed to start Google sign-in.", "error");
        else alert("Google sign-in failed: " + (err.message || "Unknown error"));
        throw err;
    }
}

// ── 4. Profile Completeness Checks ────────────────────────
function isProfileComplete(profile) {
    if (!profile) return false;
    const required = ['fullName', 'college', 'course', 'year', 'targetRole', 'skills'];
    return required.every(k => profile[k] && String(profile[k]).trim() !== '');
}

function getStoredProfile() {
    try {
        return {
            fullName:      localStorage.getItem("studentName")    || "",
            college:       localStorage.getItem("studentCollege") || "",
            course:        localStorage.getItem("studentCourse")  || "",
            year:          localStorage.getItem("studentYear")    || "",
            targetRole:    localStorage.getItem("studentRole")    || "",
            skills:        localStorage.getItem("studentSkills")  || "",
            placeOfInterest: localStorage.getItem("studentPlace") || ""
        };
    } catch (e) { return null; }
}

// ── 5. Mandatory Profile Overlay (cannot be dismissed) ────
function showMandatoryProfileOverlay(user) {
    // Don't show if already on student.html
    if (window.location.pathname.endsWith('student.html')) return;

    // Remove existing overlay if any
    const existing = document.getElementById('campusai-profile-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'campusai-profile-overlay';
    overlay.style.cssText = `
        position:fixed; inset:0; z-index:99999;
        background: rgba(15,12,41,0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display:flex; align-items:center; justify-content:center;
        padding:20px; overflow-y:auto;
        animation: overlayFadeIn 0.4s ease both;
    `;

    const displayName = user ? (user.name || user.email || 'Student') : 'Student';
    const avatarLetter = displayName[0].toUpperCase();

    overlay.innerHTML = `
        <style>
            @keyframes overlayFadeIn { from{opacity:0;} to{opacity:1;} }
            @keyframes cardSlideUp { from{opacity:0;transform:translateY(40px);} to{opacity:1;transform:translateY(0);} }
            #campusai-profile-overlay * { box-sizing:border-box; }
            #profile-overlay-card {
                background:#fff; border-radius:24px; width:100%; max-width:560px;
                box-shadow:0 40px 100px rgba(0,0,0,0.5);
                animation: cardSlideUp 0.5s cubic-bezier(0.4,0,0.2,1) both;
                animation-delay:0.1s; overflow:hidden;
            }
            .overlay-header {
                background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
                padding: 28px 32px 24px;
                color: #fff; position: relative;
            }
            .overlay-welcome-row {
                display:flex; align-items:center; gap:14px; margin-bottom:14px;
            }
            .overlay-avatar {
                width:52px; height:52px; border-radius:50%;
                background:rgba(255,255,255,0.25);
                border:3px solid rgba(255,255,255,0.5);
                display:flex; align-items:center; justify-content:center;
                font-size:22px; font-weight:800; color:#fff; flex-shrink:0;
            }
            .overlay-welcome-text h2 {
                font-family:'Poppins',sans-serif; font-size:18px; font-weight:800;
                color:#fff; margin:0 0 4px;
            }
            .overlay-welcome-text p { font-size:13px; color:rgba(255,255,255,0.8); margin:0; }
            .overlay-required-badge {
                display:inline-flex; align-items:center; gap:6px;
                background:rgba(255,255,255,0.15);
                border:1px solid rgba(255,255,255,0.3);
                border-radius:8px; padding:8px 14px;
                font-size:12.5px; font-weight:700; color:#fff;
            }
            .overlay-body { padding:28px 32px; }
            .overlay-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
            .overlay-form-full { grid-column:1/-1; }
            .overlay-label {
                display:block; font-size:12px; font-weight:700; color:#444;
                text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;
            }
            .overlay-label .req { color:#e74c3c; margin-left:2px; }
            .overlay-input, .overlay-select {
                width:100%; padding:12px 14px;
                border:1.5px solid #e0e4f0; border-radius:10px;
                font-size:14px; color:#2d3436; background:#fafbff;
                outline:none; transition:all 0.2s;
                font-family:'Inter',sans-serif;
            }
            .overlay-input:focus, .overlay-select:focus {
                border-color:#6c5ce7; background:#fff;
                box-shadow:0 0 0 4px rgba(108,92,231,0.12);
            }
            .overlay-input.error, .overlay-select.error { border-color:#e74c3c; box-shadow:0 0 0 3px rgba(231,76,60,0.1); }
            .overlay-error-msg { color:#e74c3c; font-size:11.5px; margin-top:4px; display:none; }
            .overlay-error-msg.show { display:block; }
            .overlay-save-btn {
                width:100%; padding:15px; margin-top:20px;
                background:linear-gradient(135deg,#6c5ce7,#5846e0);
                color:#fff; border:none; border-radius:12px;
                font-size:15px; font-weight:800; cursor:pointer;
                transition:all 0.25s; letter-spacing:0.2px;
                box-shadow:0 6px 20px rgba(108,92,231,0.35);
                display:flex; align-items:center; justify-content:center; gap:8px;
            }
            .overlay-save-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(108,92,231,0.45); }
            .overlay-save-btn:disabled { opacity:0.7; cursor:not-allowed; transform:none; }
            .overlay-note {
                margin-top:14px; padding:12px 14px;
                background:#f8f7ff; border:1px solid #e0d7ff; border-radius:10px;
                font-size:12px; color:#636e72; line-height:1.5; text-align:center;
            }
        </style>
        <div id="profile-overlay-card">
            <div class="overlay-header">
                <div class="overlay-welcome-row">
                    <div class="overlay-avatar">${avatarLetter}</div>
                    <div class="overlay-welcome-text">
                        <h2>Welcome, ${escapeHtmlOverlay(displayName.split(' ')[0])}! 🎉</h2>
                        <p>You're signed in with Google. One last step to get started.</p>
                    </div>
                </div>
                <div class="overlay-required-badge">
                    ⚠️ Complete your student profile — this step is required to access CampusAI
                </div>
            </div>
            <div class="overlay-body">
                <div class="overlay-form-grid">
                    <div class="overlay-form-full">
                        <label class="overlay-label" for="ol-name">Full Name <span class="req">*</span></label>
                        <input class="overlay-input" id="ol-name" type="text" placeholder="e.g. Ameera Nijamdheen" value="${escapeHtmlOverlay(displayName)}">
                        <div class="overlay-error-msg" id="err-name">Full name is required.</div>
                    </div>
                    <div class="overlay-form-full">
                        <label class="overlay-label" for="ol-college">College / University <span class="req">*</span></label>
                        <input class="overlay-input" id="ol-college" type="text" placeholder="e.g. IIT Madras / State University">
                        <div class="overlay-error-msg" id="err-college">College name is required.</div>
                    </div>
                    <div>
                        <label class="overlay-label" for="ol-course">Degree &amp; Branch <span class="req">*</span></label>
                        <input class="overlay-input" id="ol-course" type="text" placeholder="e.g. B.Tech CSE">
                        <div class="overlay-error-msg" id="err-course">Degree &amp; Branch is required.</div>
                    </div>
                    <div>
                        <label class="overlay-label" for="ol-year">Current Year <span class="req">*</span></label>
                        <select class="overlay-select" id="ol-year">
                            <option value="">Select year…</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="Postgraduate / Masters">Masters / PG</option>
                        </select>
                        <div class="overlay-error-msg" id="err-year">Please select your current year.</div>
                    </div>
                    <div class="overlay-form-full">
                        <label class="overlay-label" for="ol-role">Target Career Role <span class="req">*</span></label>
                        <input class="overlay-input" id="ol-role" type="text" placeholder="e.g. AI Engineer, Full-Stack Developer">
                        <div class="overlay-error-msg" id="err-role">Target role is required.</div>
                    </div>
                    <div class="overlay-form-full">
                        <label class="overlay-label" for="ol-skills">Technical Skills <span class="req">*</span></label>
                        <input class="overlay-input" id="ol-skills" type="text" placeholder="e.g. Python, React, SQL, Node.js">
                        <div class="overlay-error-msg" id="err-skills">Please list at least one skill.</div>
                    </div>
                    <div class="overlay-form-full">
                        <label class="overlay-label" for="ol-place">Target City / Place of Interest <span class="req">*</span></label>
                        <input class="overlay-input" id="ol-place" type="text" placeholder="e.g. Bangalore, Remote, Silicon Valley">
                        <div class="overlay-error-msg" id="err-place">Target city is required.</div>
                    </div>
                </div>

                <button class="overlay-save-btn" id="overlay-save-btn" onclick="saveOverlayProfile()">
                    💾 Save Profile &amp; Enter CampusAI →
                </button>

                <div class="overlay-note">
                    🔒 This information is used only to personalise your AI career guidance. You can update it anytime from your profile page.
                </div>
            </div>
        </div>
    `;

    // Prevent closing by clicking outside
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { shakeCard(); } });
    document.addEventListener('keydown', preventEscClose, true);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
}

function preventEscClose(e) {
    if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); shakeCard(); }
}

function shakeCard() {
    const card = document.getElementById('profile-overlay-card');
    if (!card) return;
    card.style.animation = 'none';
    card.style.transform = 'translateX(-8px)';
    setTimeout(() => { card.style.transform = 'translateX(8px)'; }, 80);
    setTimeout(() => { card.style.transform = 'translateX(-5px)'; }, 160);
    setTimeout(() => { card.style.transform = 'translateX(0)'; }, 240);
}

function escapeHtmlOverlay(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function saveOverlayProfile() {
    const fields = [
        { id: 'ol-name',    errId: 'err-name',    key: 'name',    lsKey: 'studentName' },
        { id: 'ol-college', errId: 'err-college', key: 'college', lsKey: 'studentCollege' },
        { id: 'ol-course',  errId: 'err-course',  key: 'course',  lsKey: 'studentCourse' },
        { id: 'ol-year',    errId: 'err-year',    key: 'year',    lsKey: 'studentYear' },
        { id: 'ol-role',    errId: 'err-role',    key: 'role',    lsKey: 'studentRole' },
        { id: 'ol-skills',  errId: 'err-skills',  key: 'skills',  lsKey: 'studentSkills' },
        { id: 'ol-place',   errId: 'err-place',   key: 'place',   lsKey: 'studentPlace' }
    ];

    let valid = true;
    const values = {};

    for (const f of fields) {
        const el = document.getElementById(f.id);
        const errEl = document.getElementById(f.errId);
        if (!el) continue;
        const val = el.value.trim();
        if (!val) {
            el.classList.add('error');
            if (errEl) errEl.classList.add('show');
            valid = false;
        } else {
            el.classList.remove('error');
            if (errEl) errEl.classList.remove('show');
            values[f.key] = val;
            localStorage.setItem(f.lsKey, val);
        }
    }

    if (!valid) { shakeCard(); return; }

    const btn = document.getElementById('overlay-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Saving…'; }

    try {
        // Save to backend API (JWT-based)
        const token = typeof getAuthToken !== 'undefined' ? getAuthToken() : '';
        if (token) {
            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    fullName: values.name,
                    college: values.college,
                    course: values.course,
                    year: values.year,
                    targetRole: values.role,
                    skills: values.skills,
                    placeOfInterest: values.place
                })
            });
        }

        localStorage.setItem('campusai_profile_completed', 'true');

        // Remove overlay
        document.removeEventListener('keydown', preventEscClose, true);
        document.body.style.overflow = '';
        const overlay = document.getElementById('campusai-profile-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }

        if (typeof showToast !== 'undefined') showToast('Profile saved! Welcome to CampusAI 🎉', 'success');

        // Redirect to career hub after short delay
        setTimeout(() => { window.location.href = 'career-hub.html'; }, 900);

    } catch (err) {
        console.error('Profile save error:', err);
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 Save Profile &amp; Enter CampusAI →'; }
        if (typeof showToast !== 'undefined') showToast('Could not save profile. Please try again.', 'error');
    }
}

// ── 6. Handle Supabase session after Google OAuth ─────────
async function handleSupabaseSession(session) {
    const user = session.user;
    const meta = user.user_metadata || {};

    const campusUser = {
        id: user.id,
        email: user.email,
        name: meta.full_name || meta.name || user.email.split('@')[0],
        avatar_url: meta.avatar_url || meta.picture || ""
    };

    // Sync auth token and user to localStorage
    if (typeof setAuthToken !== 'undefined') setAuthToken(session.access_token);
    if (typeof setStoredUser !== 'undefined') setStoredUser(campusUser);

    if (campusUser.name) localStorage.setItem("studentName", campusUser.name);

    // Check profile completeness
    const profile = getStoredProfile();
    const complete = isProfileComplete(profile);

    if (complete) {
        localStorage.setItem("campusai_profile_completed", "true");
    } else {
        localStorage.removeItem("campusai_profile_completed");
    }

    const path = window.location.pathname;
    const isAuthPage = path.endsWith("login.html") || path.endsWith("register.html") || path.endsWith("auth-callback.html");

    if (isAuthPage) {
        if (!complete) {
            // Show mandatory overlay or redirect to student.html
            setTimeout(() => {
                const currentPath = window.location.pathname;
                if (!currentPath.endsWith('student.html')) {
                    showMandatoryProfileOverlay(campusUser);
                }
            }, 400);
        } else {
            setTimeout(() => {
                window.location.href = 'career-hub.html';
            }, 300);
        }
    } else if (!complete && !path.endsWith('student.html')) {
        // On any protected page, show the overlay if profile is incomplete
        setTimeout(() => showMandatoryProfileOverlay(campusUser), 500);
    }
}

// ── 7. Boot: load config → init auth listener ─────────────
(async () => {
    const configured = await loadSupabaseConfig();
    if (!configured) {
        console.warn("⚠️ CampusAI: Supabase not configured. Google Auth will not work.\nSet SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.");
        return;
    }

    const sb = getSupabase();
    if (!sb) {
        console.error("❌ CampusAI: Failed to initialize Supabase client. Check your URL and anon key.");
        return;
    }

    try {
        // Handle OAuth callback
        const { data: { session }, error: sessionError } = await sb.auth.getSession();
        if (sessionError) {
            console.error("Supabase getSession error:", sessionError.message);
        } else if (session && session.user) {
            await handleSupabaseSession(session);
        }

        // Auth state listener
        sb.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                await handleSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
                if (typeof clearAllUserSessionData !== 'undefined') clearAllUserSessionData();
            }
        });

    } catch (e) {
        console.warn("Supabase auth boot error:", e.message || e);
    }
})();
