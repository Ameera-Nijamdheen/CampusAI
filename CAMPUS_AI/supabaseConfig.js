// ==========================================================
// CampusAI Supabase Auth — Clean Production Build
// Google OAuth → Backend JWT bridge → Profile enforcement
// ==========================================================

window.CAMPUS_AI_SUPABASE_CONFIG = { url: "", anonKey: "" };
let supabaseClient = null;
let _supabaseBootDone = false;

// ── 1. Load config from backend ───────────────────────────
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
    } catch (e) { /* offline */ }
    const storedUrl = localStorage.getItem("custom_supabase_url");
    const storedKey = localStorage.getItem("custom_supabase_anon_key");
    if (storedUrl && storedKey) {
        window.CAMPUS_AI_SUPABASE_CONFIG.url = storedUrl;
        window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = storedKey;
        return true;
    }
    return false;
}

// ── 2. Supabase client ────────────────────────────────────
function getSupabase() {
    if (supabaseClient) return supabaseClient;
    const { url, anonKey } = window.CAMPUS_AI_SUPABASE_CONFIG;
    if (window.supabase && url && anonKey) {
        try {
            supabaseClient = window.supabase.createClient(url, anonKey);
            return supabaseClient;
        } catch (e) { console.error("Supabase init error:", e); }
    }
    return null;
}

// ── 3. Google Sign-In ─────────────────────────────────────
async function signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) {
        alert("Supabase not configured. Check .env file.");
        return;
    }
    const origin = window.location.origin;
    const redirectTo = origin + '/auth-callback.html';
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo,
            queryParams: { access_type: 'offline', prompt: 'consent' }
        }
    });
    if (error) throw error;
}

// ── 4. Bridge: Google session → Backend JWT ───────────────
async function bridgeGoogleToBackend(supabaseUser) {
    const meta = supabaseUser.user_metadata || {};
    const name = meta.full_name || meta.name || supabaseUser.email.split('@')[0];
    const email = supabaseUser.email;

    try {
        const res = await fetch('/api/auth/google-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, googleId: supabaseUser.id })
        });
        if (!res.ok) throw new Error("Bridge failed");
        const data = await res.json();

        // Store backend JWT + user
        localStorage.setItem("campusai_token", data.token);
        localStorage.setItem("campusai_user", JSON.stringify(data.user));
        localStorage.setItem("userName", data.user.name || "");
        localStorage.setItem("userEmail", data.user.email || "");
        localStorage.setItem("studentName", data.user.name || "");

        // Sync profile data to localStorage
        if (data.profile) {
            const p = data.profile;
            if (p.college) localStorage.setItem("studentCollege", p.college);
            if (p.course) localStorage.setItem("studentCourse", p.course);
            if (p.year) localStorage.setItem("studentYear", p.year);
            if (p.targetRole) localStorage.setItem("studentRole", p.targetRole);
            if (p.skills) localStorage.setItem("studentSkills", p.skills);
            if (p.placeOfInterest) localStorage.setItem("studentPlace", p.placeOfInterest);

            // Check completeness
            const complete = p.college && p.course && p.year && p.targetRole && p.skills &&
                p.college.trim() !== "" && p.course.trim() !== "" && p.skills.trim() !== "";
            if (complete) {
                localStorage.setItem("campusai_profile_completed", "true");
            }
        }

        return data;
    } catch (err) {
        console.error("Backend bridge error:", err);
        return null;
    }
}

// ── 5. Handle session after OAuth callback ────────────────
async function handleSupabaseSession(session) {
    if (!session || !session.user) return;

    const bridgeResult = await bridgeGoogleToBackend(session.user);
    if (!bridgeResult) return;

    window.dispatchEvent(new CustomEvent('campusai:session-ready', { detail: bridgeResult }));

    const path = window.location.pathname;
    // Only auto-redirect on auth-callback.html
    if (path.endsWith("auth-callback.html")) {
        const isComplete = localStorage.getItem("campusai_profile_completed") === "true";
        if (isComplete) {
            window.location.href = 'career-hub.html';
        } else {
            window.location.href = 'student.html?mandatory=true';
        }
    }
}

// ── 6. Boot ───────────────────────────────────────────────
(async () => {
    const configured = await loadSupabaseConfig();
    if (!configured) {
        _supabaseBootDone = true;
        return;
    }

    const sb = getSupabase();
    if (!sb) {
        _supabaseBootDone = true;
        return;
    }

    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (!error && session && session.user) {
            await handleSupabaseSession(session);
        }

        sb.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                await handleSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem("campusai_token");
                localStorage.removeItem("campusai_user");
                localStorage.removeItem("campusai_profile_completed");
            }
        });
    } catch (e) {
        console.warn("Supabase boot error:", e);
    }

    _supabaseBootDone = true;
})();
