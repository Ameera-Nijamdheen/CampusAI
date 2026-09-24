// ==========================================================
// CampusAI Supabase & Google Authentication Client Configuration
// ==========================================================

// 🔑 REPLACE THESE WITH YOUR SUPABASE PROJECT CREDENTIALS:
// 1. Go to https://supabase.com/dashboard -> Your Project -> Project Settings -> API
// 2. Copy the "Project URL" and the "anon public" API Key
window.CAMPUS_AI_SUPABASE_CONFIG = {
    url: window.SUPABASE_URL || "https://your-project-id.supabase.co",
    anonKey: window.SUPABASE_ANON_KEY || "your-anon-key-here"
};

// Global Supabase Client Instance
let supabaseClient = null;

function getSupabase() {
    if (supabaseClient) return supabaseClient;
    
    const config = window.CAMPUS_AI_SUPABASE_CONFIG;
    if (window.supabase && config.url && config.url.indexOf("your-project-id") === -1) {
        try {
            supabaseClient = window.supabase.createClient(config.url, config.anonKey);
            return supabaseClient;
        } catch (e) {
            console.warn("Supabase init warning:", e);
        }
    }
    return null;
}

// Check if user has valid Supabase configuration
function isSupabaseConfigured() {
    const config = window.CAMPUS_AI_SUPABASE_CONFIG;
    return !!(config && config.url && config.anonKey && 
             config.url.indexOf("your-project-id") === -1 &&
             config.anonKey.indexOf("your-anon-key") === -1);
}

// Sign In with Google via Supabase OAuth
async function signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) {
        // Fallback / Guidance prompt if Supabase keys not set yet
        const enteredUrl = prompt(
            "⚡ Supabase Configuration Required\n\nTo connect Google Sign-In, please enter your Supabase Project URL (e.g., https://xyzcompany.supabase.co):",
            localStorage.getItem("custom_supabase_url") || ""
        );
        if (!enteredUrl) return;

        const enteredKey = prompt(
            "Enter your Supabase 'anon public' API key:",
            localStorage.getItem("custom_supabase_anon_key") || ""
        );
        if (!enteredKey) return;

        localStorage.setItem("custom_supabase_url", enteredUrl.trim());
        localStorage.setItem("custom_supabase_anon_key", enteredKey.trim());
        window.CAMPUS_AI_SUPABASE_CONFIG.url = enteredUrl.trim();
        window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = enteredKey.trim();
        
        showToast("Supabase configured! Redirecting to Google...", "info");
        setTimeout(() => signInWithGoogle(), 800);
        return;
    }

    try {
        const redirectUrl = window.location.origin + window.location.pathname.replace(/login\.html|register\.html/, 'student.html');
        const { data, error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;
    } catch (err) {
        console.error("Google Auth error:", err);
        showToast(err.message || "Failed to start Google sign-in", "error");
    }
}

// Profile Mandatory Fields Check
function isProfileComplete(profile) {
    if (!profile) return false;
    const required = ['fullName', 'college', 'course', 'year', 'targetRole', 'skills'];
    for (const key of required) {
        if (!profile[key] || String(profile[key]).trim() === '') {
            return false;
        }
    }
    return true;
}

// Listen to Supabase Auth state changes
window.addEventListener("DOMContentLoaded", async () => {
    // Check custom keys from localStorage if any
    const storedUrl = localStorage.getItem("custom_supabase_url");
    const storedKey = localStorage.getItem("custom_supabase_anon_key");
    if (storedUrl && storedKey) {
        window.CAMPUS_AI_SUPABASE_CONFIG.url = storedUrl;
        window.CAMPUS_AI_SUPABASE_CONFIG.anonKey = storedKey;
    }

    const sb = getSupabase();
    if (!sb) return;

    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session && session.user) {
            handleSupabaseSession(session);
        }

        sb.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                handleSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
                clearAllUserSessionData();
            }
        });
    } catch (e) {
        console.warn("Supabase session check:", e);
    }
});

async function handleSupabaseSession(session) {
    const user = session.user;
    const meta = user.user_metadata || {};
    
    const campusUser = {
        id: user.id,
        email: user.email,
        name: meta.full_name || meta.name || user.email.split('@')[0],
        avatar_url: meta.avatar_url || meta.picture || ""
    };

    setAuthToken(session.access_token);
    setStoredUser(campusUser);

    // Sync with backend / check profile completeness
    const profile = getStoredProfile();
    const isComplete = isProfileComplete(profile);

    // If current page is login or register, route appropriately
    const path = window.location.pathname;
    if (path.endsWith("login.html") || path.endsWith("register.html")) {
        if (!isComplete) {
            window.location.href = "student.html?mandatory=true";
        } else {
            window.location.href = "career-hub.html";
        }
    }
}

function getStoredProfile() {
    try {
        const raw = localStorage.getItem("campusai_profile");
        return raw ? JSON.parse(raw) : {
            fullName: localStorage.getItem("studentName") || "",
            college: localStorage.getItem("studentCollege") || "",
            course: localStorage.getItem("studentCourse") || "",
            year: localStorage.getItem("studentYear") || "",
            targetRole: localStorage.getItem("studentRole") || "",
            skills: localStorage.getItem("studentSkills") || "",
            placeOfInterest: localStorage.getItem("studentPlace") || ""
        };
    } catch (e) {
        return null;
    }
}
