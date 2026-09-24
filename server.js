require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const database = require('./database');
const groqService = require('./groqService');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'campus_ai_jwt_secret_token_secure_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend from CAMPUS_AI directory
const FRONTEND_DIR = path.join(__dirname, 'CAMPUS_AI');
app.use(express.static(FRONTEND_DIR));

// Helper: Token Generation
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. Please log in." });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired session. Please log in again." });
        }
        req.user = decoded;
        next();
    });
}

// Optional Auth (for public routes that can be personalized if logged in)
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) req.user = decoded;
            next();
        });
    } else {
        next();
    }
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required." });
        }

        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ error: "Please enter a valid email address." });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }

        const user = database.createUser({ name, email, password });
        const token = generateToken(user);
        const profile = database.getProfile(user.id);

        res.status(201).json({
            success: true,
            message: "Account created successfully! Welcome to CampusAI.",
            token,
            user: { id: user.id, name: user.name, email: user.email },
            profile
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Please enter both email and password." });
        }

        const user = database.findUserByEmail(email);
        if (!user || !database.verifyPassword(user, password)) {
            return res.status(401).json({ error: "Invalid email or password. Please check your credentials or register." });
        }

        const token = generateToken(user);
        const profile = database.getProfile(user.id);

        res.json({
            success: true,
            message: "Welcome back, " + user.name + "!",
            token,
            user: { id: user.id, name: user.name, email: user.email },
            profile
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error during login." });
    }
});

// Get Current User Session
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = database.findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: "User not found." });
    }
    const profile = database.getProfile(user.id);
    res.json({
        user: { id: user.id, name: user.name, email: user.email },
        profile
    });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: "Logged out successfully." });
});

// ==========================================
// 2. STUDENT PROFILE & PREFERENCES ROUTES
// ==========================================

// Get Profile
app.get('/api/profile', authenticateToken, (req, res) => {
    const profile = database.getProfile(req.user.id);
    res.json(profile);
});

// Save / Update Profile (Comprehensive with Place of Interest & Career Goals)
app.post('/api/profile', authenticateToken, (req, res) => {
    try {
        const updated = database.updateProfile(req.user.id, req.body);
        res.json({
            success: true,
            message: "Student profile updated successfully! 🎓",
            profile: updated
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// 3. ACHIEVEMENTS & PROOF VAULT ROUTES
// ==========================================

app.get('/api/achievements', authenticateToken, (req, res) => {
    const items = database.getAchievements(req.user.id);
    res.json(items);
});

app.post('/api/achievements', authenticateToken, (req, res) => {
    try {
        const { type, name, organization, year, fileName } = req.body;
        if (!name || !organization || !year) {
            return res.status(400).json({ error: "Please provide achievement name, organization, and year." });
        }
        const created = database.addAchievement(req.user.id, { type, name, organization, year, fileName });
        res.status(201).json({ success: true, achievement: created });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/achievements/:id', authenticateToken, (req, res) => {
    const deleted = database.deleteAchievement(req.user.id, req.params.id);
    if (deleted) {
        res.json({ success: true, message: "Achievement removed." });
    } else {
        res.status(404).json({ error: "Achievement not found." });
    }
});

// ==========================================
// 4. GROQ AI CAREER & STUDY GUIDANCE ROUTES
// ==========================================

// Check Groq status (Managed strictly via .env)
app.get('/api/config/ai-status', (req, res) => {
    const hasKey = groqService.hasValidGroqKey();
    res.json({
        groqConnected: hasKey,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        customKeyAllowed: false,
        message: hasKey 
            ? "Groq AI (Llama 3.3 70B) active & accelerated via server .env" 
            : "Running CampusAI Intelligent Engine (Server .env key ready)"
    });
});

// Setting custom Groq key by public is disabled - strictly managed via server .env
app.post('/api/config/groq-key', (req, res) => {
    return res.status(403).json({
        error: "Custom Groq API key configuration is disabled. The system uses the official server GROQ_API_KEY configured in .env."
    });
});

// Main AI Career & Study Guidance (Requires Login)
// Generates: What to study, Recommended courses, Roadmap, Place of Interest market dynamics
app.post('/api/ai/career-guidance', authenticateToken, async (req, res) => {
    try {
        let studentData = req.body || {};

        // Merge with student's saved profile
        const profile = database.getProfile(req.user.id);
        studentData = {
            course: studentData.course || profile.course,
            year: studentData.year || profile.year,
            college: studentData.college || profile.college,
            placeOfInterest: studentData.placeOfInterest || profile.placeOfInterest,
            targetRole: studentData.targetRole || profile.targetRole,
            skills: studentData.skills || profile.skills,
            interests: studentData.interests || profile.interests,
            focusTopic: studentData.focusTopic || ""
        };

        const guidance = await groqService.generateCareerGuidance(studentData);

        // Record history
        database.saveGuidanceHistory(req.user.id, studentData, guidance);

        res.json({
            success: true,
            guidance
        });
    } catch (err) {
        console.error("AI Guidance error:", err);
        res.status(500).json({ error: "Failed to generate AI guidance: " + err.message });
    }
});

// Interactive Career Coach Chat (Requires Login)
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Messages array is required." });
        }

        const studentProfile = database.getProfile(req.user.id);
        const result = await groqService.chatWithCareerCoach({ messages, studentProfile });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "AI Chat error: " + err.message });
    }
});

// Automated Resume & Profile Scorer (Requires Login)
app.post('/api/ai/resume-score', authenticateToken, async (req, res) => {
    try {
        const { resumeText, targetRole } = req.body;
        const studentProfile = database.getProfile(req.user.id);

        const evaluation = await groqService.analyzeResume({ resumeText, targetRole, studentProfile });
        res.json(evaluation);
    } catch (err) {
        res.status(500).json({ error: "Resume evaluation error: " + err.message });
    }
});

// ==========================================
// 5. OPPORTUNITIES & APPLICATIONS ROUTES
// ==========================================

// List opportunities (Requires Login)
app.get('/api/opportunities', authenticateToken, (req, res) => {
    const { category, search } = req.query;
    const items = database.getOpportunities(category, search);
    res.json(items);
});

// Single opportunity detail (Requires Login)
app.get('/api/opportunities/:id', authenticateToken, (req, res) => {
    const item = database.getOpportunityById(req.params.id);
    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ error: "Opportunity not found." });
    }
});

// Submit Application (Requires Login)
app.post('/api/applications', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { opportunityTitle, applicantName, email, college, skills, coverNote } = req.body;

        if (!opportunityTitle || !applicantName || !email) {
            return res.status(400).json({ error: "Opportunity title, name, and email are required." });
        }

        const appRecord = database.createApplication(userId, {
            opportunityTitle,
            applicantName,
            email,
            college,
            skills,
            coverNote
        });

        res.status(201).json({
            success: true,
            message: "Application submitted successfully! 🚀",
            application: appRecord
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// User's Submitted Applications
app.get('/api/applications', authenticateToken, (req, res) => {
    const apps = database.getApplications(req.user.id);
    res.json(apps);
});

// ==========================================
// 6. PROJECTS SHOWCASE ROUTES
// ==========================================

// List projects (Requires Login)
app.get('/api/projects', authenticateToken, (req, res) => {
    const { category } = req.query;
    const items = database.getProjects(category);
    res.json(items);
});

app.post('/api/projects', authenticateToken, (req, res) => {
    try {
        const { title, description, category, tags, demoUrl, githubUrl } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: "Project title and description are required." });
        }

        const created = database.addProject(req.user.id, {
            title,
            description,
            category,
            tags,
            demoUrl,
            githubUrl
        });

        res.status(201).json({
            success: true,
            message: "Project published to showcase! 🎨",
            project: created
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Public Supabase configuration endpoint (safely exposes public URL and anon key)
app.get('/api/config/supabase', (req, res) => {
    res.json({
        url: process.env.SUPABASE_URL || "",
        anonKey: process.env.SUPABASE_ANON_KEY || ""
    });
});

// Clean root handler
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Fallback 404 for unknown API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 CampusAI Backend Server running on http://localhost:${PORT}`);
    console.log(`⚡ Serving static files from: ${FRONTEND_DIR}`);
    console.log(`🤖 Groq AI Integration: ${groqService.hasValidGroqKey() ? 'CONNECTED' : 'STANDBY (Intelligent Engine Active)'}`);
    console.log(`🔐 Supabase: ${process.env.SUPABASE_URL ? 'CONFIGURED (' + process.env.SUPABASE_URL + ')' : 'NOT CONFIGURED (set SUPABASE_URL in .env)'}`);
    console.log(`====================================================`);
});
