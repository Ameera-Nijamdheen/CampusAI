// ==========================================================
// CampusAI Supabase & Google Authentication - Production Ready
// Credentials auto-loaded from backend /api/config/supabase
// ==========================================================

window.CAMPUS_AI_SUPABASE_CONFIG = { url: "", anonKey: "" };
let supabaseClient = null;

// Auto-load credentials from backend (reads from .env)
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

    // Fallback to localStorage (set via "Configure Supabase" button)
    const storedUrl = localStorage.getItem("custom_supabase_url");
    const storedKey = localStorage.getItem("custom_supabase_anon_key");
    if (storedUrl && storedKey) {
        window.CAMPUS_AI_SUPABASE_CONFIG.url = storedUrl;
        window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = storedKey;
        return true;
    }
    return false;
}

function getSupabase() {
    if (supabaseClient) return supabaseClient;
    const { url, anonKey } = window.CAMPUS_AI_SUPABASE_CONFIG;
    if (window.supabase && url && anonKey && !url.includes("your-project-id")) {
        try {
            supabaseClient = window.supabase.createClient(url, anonKey);
            window.supabaseClient = supabaseClient; // expose globally
            return supabaseClient;
        } catch (e) { console.warn("Supabase init:", e); }
    }
    return null;
}

function isSupabaseConfigured() {
    const { url, anonKey } = window.CAMPUS_AI_SUPABASE_CONFIG;
    return !!(url && anonKey && !url.includes("your-project-id") && !anonKey.includes("your-supabase"));
}

// Google Sign-In via Supabase OAuth
async function signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) {
        promptSupabaseKeys();
        return;
    }
    try {
        const origin = window.location.origin;
        const path = window.location.pathname;
        const redirectTo = origin + path.replace(/login\.html|register\.html/, 'student.html');
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
        if (typeof showToast !== 'undefined') {
            showToast(err.message || "Failed to start Google sign-in. Check Supabase config.", "error");
        }
    }
}

// Profile complete check
function isProfileComplete(profile) {
    if (!profile) return false;
    const required = ['fullName', 'college', 'course', 'year', 'targetRole', 'skills'];
    return required.every(k => profile[k] && String(profile[k]).trim() !== '');
}

// Handle Supabase session (Google OAuth callback or existing session)
async function handleSupabaseSession(session) {
    const user = session.user;
    const meta = user.user_metadata || {};
    const campusUser = {
        id: user.id,
        email: user.email,
        name: meta.full_name || meta.name || user.email.split('@')[0],
        avatar_url: meta.avatar_url || meta.picture || ""
    };

    // Store auth token and user (works with existing auth wall)
    if (typeof setAuthToken !== 'undefined') setAuthToken(session.access_token);
    if (typeof setStoredUser !== 'undefined') setStoredUser(campusUser);

    // Prefill studentName from Google profile
    if (campusUser.name) localStorage.setItem("studentName", campusUser.name);

    const profile = getStoredProfile();
    const complete = isProfileComplete(profile);
    if (complete) {
        localStorage.setItem("campusai_profile_completed", "true");
    } else {
        localStorage.removeItem("campusai_profile_completed");
    }

    const path = window.location.pathname;
    const isAuthPage = path.endsWith("login.html") || path.endsWith("register.html");
    if (isAuthPage) {
        setTimeout(() => {
            window.location.href = complete ? "career-hub.html" : "student.html?mandatory=true";
        }, 300);
    }
}

function getStoredProfile() {
    try {
        return {
            fullName: localStorage.getItem("studentName") || "",
            college: localStorage.getItem("studentCollege") || "",
            course: localStorage.getItem("studentCourse") || "",
            year: localStorage.getItem("studentYear") || "",
            targetRole: localStorage.getItem("studentRole") || "",
            skills: localStorage.getItem("studentSkills") || "",
            placeOfInterest: localStorage.getItem("studentPlace") || ""
        };
    } catch (e) { return null; }
}

// Boot: load config then set up auth listener
(async () => {
    await loadSupabaseConfig();
    const sb = getSupabase();
    if (!sb) return;

    try {
        // Handle OAuth callback (Google redirect comes back with #access_token or ?code=)
        const { data: { session } } = await sb.auth.getSession();
        if (session && session.user) {
            await handleSupabaseSession(session);
        }

        sb.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                await handleSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
                if (typeof clearAllUserSessionData !== 'undefined') clearAllUserSessionData();
            }
        });
    } catch (e) {
        console.warn("Supabase auth boot:", e);
    }
})();
