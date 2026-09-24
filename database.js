const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'campusai_db.json');

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial Seeds
const DEFAULT_OPPORTUNITIES = [
    {
        id: "opp-1",
        title: "AI Innovation Hackathon",
        category: "Hackathon",
        domain: "AI / ML",
        icon: "🤖",
        organization: "CampusAI Global Tech Hub",
        eligibility: "Undergraduate & Graduate Students",
        stipend: "$10,000 Prize Pool + Mentorship",
        deadline: "October 30, 2026",
        mode: "Hybrid / Bangalore & Online",
        location: "Bangalore, India",
        description: "Build cutting-edge Artificial Intelligence and Machine Learning solutions with peers across universities.",
        skills: ["PyTorch", "Python", "Deep Learning", "FastAPI"]
    },
    {
        id: "opp-2",
        title: "GenAI Challenge 2026",
        category: "Hackathon",
        domain: "Generative AI",
        icon: "🧠",
        organization: "Generative AI Labs",
        eligibility: "All enrolled university students",
        stipend: "Cloud credits ($5,000) + Cash Awards",
        deadline: "November 15, 2026",
        mode: "Online / Global",
        location: "Remote",
        description: "Create breakthrough applications leveraging LLMs, diffusion models, and prompt engineering.",
        skills: ["LLMs", "LangChain", "Prompt Engineering", "Full-Stack AI"]
    },
    {
        id: "opp-3",
        title: "AI/ML Engineering Internship",
        category: "Internship",
        domain: "AI / ML",
        icon: "🚀",
        organization: "Apex AI Technologies",
        eligibility: "Pre-final and Final Year Students",
        stipend: "₹45,000 / Month + PPO",
        deadline: "October 25, 2026",
        mode: "Hybrid",
        location: "Bangalore / Hyderabad",
        description: "Hands-on industry internship working on production machine learning pipelines and transformer models.",
        skills: ["PyTorch", "MLOps", "Transformers", "Docker"]
    },
    {
        id: "opp-4",
        title: "Full-Stack Python Developer Internship",
        category: "Internship",
        domain: "Software Engineering",
        icon: "💻",
        organization: "DevCore Systems",
        eligibility: "Students proficient in Python & Web",
        stipend: "₹35,000 / Month",
        deadline: "November 10, 2026",
        mode: "Remote",
        location: "Pune / Remote",
        description: "Collaborate with senior engineers building robust Python backend microservices and modern frontends.",
        skills: ["Python", "FastAPI", "React", "PostgreSQL"]
    },
    {
        id: "opp-5",
        title: "Data Science & Analytics Internship",
        category: "Internship",
        domain: "Data Science",
        icon: "📊",
        organization: "Insight Analytics Corp",
        eligibility: "STEM & Analytics students",
        stipend: "₹38,000 / Month",
        deadline: "November 20, 2026",
        mode: "Hybrid",
        location: "Gurgaon / Mumbai",
        description: "Analyze large-scale student and enterprise datasets, build predictive models, and deploy executive dashboards.",
        skills: ["Data Analysis", "Pandas", "Scikit-Learn", "SQL"]
    },
    {
        id: "opp-6",
        title: "Modern Web & Cloud Bootcamp",
        category: "Workshop",
        domain: "Web Development",
        icon: "🌐",
        organization: "Frontend Guild & AWS Cloud",
        eligibility: "Open to all students",
        stipend: "Verified Industry Credential",
        deadline: "November 12, 2026",
        mode: "Virtual Workshop",
        location: "Online",
        description: "Master modern full-stack web standards, cloud deployment on AWS, and API microservices architecture.",
        skills: ["JavaScript", "Node.js", "AWS", "REST APIs"]
    },
    {
        id: "opp-7",
        title: "Deep Learning & NLP Masterclass",
        category: "Workshop",
        domain: "AI / ML",
        icon: "🎓",
        organization: "Tech Academy International",
        eligibility: "Beginners & Intermediates",
        stipend: "Certificate + GPU Cloud Voucher",
        deadline: "October 18, 2026",
        mode: "Interactive Live Webinar",
        location: "Online",
        description: "Comprehensive hands-on workshop covering computer vision, modern transformers, and deploying with Groq.",
        skills: ["Deep Learning", "NLP", "Groq API", "Model Optimization"]
    },
    {
        id: "opp-8",
        title: "National Tech Innovation Challenge",
        category: "Competition",
        domain: "Innovation",
        icon: "🏆",
        organization: "Venture Next Foundation",
        eligibility: "Teams of 1 to 4 students",
        stipend: "₹5,00,000 Incubation Grant",
        deadline: "November 25, 2026",
        mode: "Hybrid",
        location: "Delhi / Bangalore",
        description: "Pitch groundbreaking tech solutions tackling healthcare, education, smart cities, and clean energy.",
        skills: ["Design Thinking", "Prototyping", "Pitching", "Tech Architecture"]
    },
    {
        id: "opp-9",
        title: "AI & ML Academic Fellowship",
        category: "Scholarship",
        domain: "AI / ML",
        icon: "💰",
        organization: "DeepTech Research Foundation",
        eligibility: "Students pursuing AI research",
        stipend: "₹1,50,000 Direct Fellowship Grant",
        deadline: "January 15, 2027",
        mode: "Research Grant",
        location: "National",
        description: "Financial grant awarding undergraduate and postgraduate researchers advancing machine learning theory & applications.",
        skills: ["AI Research", "Machine Learning", "Mathematics", "Ethics in AI"]
    }
];

const DEFAULT_PROJECTS = [
    {
        id: "proj-1",
        userId: "demo-user-1",
        authorName: "Demo Student",
        title: "AI Tutor & Roadmap Generator",
        description: "Autonomous study assistant powered by LLMs that generates custom semester roadmaps and quizzes based on university syllabus.",
        category: "Generative AI",
        tags: ["Groq", "Python", "Llama-3", "FastAPI"],
        demoUrl: "https://github.com",
        githubUrl: "https://github.com",
        createdAt: new Date().toISOString()
    },
    {
        id: "proj-2",
        userId: "demo-user-1",
        authorName: "Aarav Sharma",
        title: "Real-Time Campus Navigation & Event Tracker",
        description: "Interactive campus map with geo-fencing for real-time lecture halls, hackathon venues, and student clubs.",
        category: "Web Dev",
        tags: ["JavaScript", "Leaflet", "Node.js", "Express"],
        demoUrl: "https://github.com",
        githubUrl: "https://github.com",
        createdAt: new Date().toISOString()
    }
];

function getInitialDatabase() {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync("password123", salt);

    return {
        users: [
            {
                id: "demo-user-1",
                name: "Demo Student",
                email: "demo@campusai.com",
                passwordHash: demoPasswordHash,
                createdAt: new Date().toISOString()
            }
        ],
        profiles: {
            "demo-user-1": {
                userId: "demo-user-1",
                fullName: "Demo Student",
                college: "Indian Institute of Technology / Tech University",
                course: "B.Tech Computer Science & Engineering",
                year: "3rd Year",
                gpa: "8.9 / 10",
                skills: "Python, JavaScript, Machine Learning, PyTorch, Node.js, SQL",
                interests: "Artificial Intelligence, Full-Stack Development, Cloud Computing",
                placeOfInterest: "Bangalore, India (Hybrid/Remote)",
                targetRole: "AI / Machine Learning Engineer",
                careerGoals: "Work as an applied AI engineer at high-growth tech firms or global AI labs.",
                preferredWorkMode: "Hybrid",
                updatedAt: new Date().toISOString()
            }
        },
        achievements: [
            {
                id: 101,
                userId: "demo-user-1",
                type: "Hackathon",
                name: "Smart India Hackathon Finalist",
                organization: "Ministry of Education",
                year: "2025",
                fileName: "SIH_Certificate.pdf",
                createdAt: new Date().toISOString()
            },
            {
                id: 102,
                userId: "demo-user-1",
                type: "Certification",
                name: "Deep Learning Specialization",
                organization: "DeepLearning.AI / Coursera",
                year: "2025",
                fileName: "Coursera_DL.pdf",
                createdAt: new Date().toISOString()
            }
        ],
        projects: DEFAULT_PROJECTS,
        opportunities: DEFAULT_OPPORTUNITIES,
        applications: [],
        guidanceHistory: [],
        config: {
            customGroqKey: ""
        }
    };
}

class Database {
    constructor() {
        this.data = null;
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const content = fs.readFileSync(DB_FILE, 'utf-8');
                this.data = JSON.parse(content);
                // Ensure required keys exist
                if (!this.data.opportunities || this.data.opportunities.length === 0) {
                    this.data.opportunities = DEFAULT_OPPORTUNITIES;
                }
                if (!this.data.projects) this.data.projects = DEFAULT_PROJECTS;
                if (!this.data.applications) this.data.applications = [];
                if (!this.data.guidanceHistory) this.data.guidanceHistory = [];
                if (!this.data.config) this.data.config = { customGroqKey: "" };
            } else {
                this.data = getInitialDatabase();
                this.save();
            }
        } catch (err) {
            console.error("Error loading database, resetting to initial:", err);
            this.data = getInitialDatabase();
            this.save();
        }
    }

    save() {
        try {
            const tempFile = `${DB_FILE}.tmp`;
            fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
            fs.renameSync(tempFile, DB_FILE);
        } catch (err) {
            console.error("Error saving database:", err);
        }
    }

    // --- Users ---
    findUserByEmail(email) {
        if (!email) return null;
        const normalized = email.trim().toLowerCase();
        return this.data.users.find(u => u.email.toLowerCase() === normalized) || null;
    }

    findUserById(id) {
        return this.data.users.find(u => u.id === id) || null;
    }

    createUser({ name, email, password }) {
        const normalizedEmail = email.trim().toLowerCase();
        if (this.findUserByEmail(normalizedEmail)) {
            throw new Error("An account with this email already exists.");
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        const newUser = {
            id: "user-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            createdAt: new Date().toISOString()
        };

        this.data.users.push(newUser);

        // Initialize empty profile
        this.data.profiles[newUser.id] = {
            userId: newUser.id,
            fullName: newUser.name,
            college: "",
            course: "",
            year: "",
            gpa: "",
            skills: "",
            interests: "",
            placeOfInterest: "Bangalore / Remote",
            targetRole: "Software Engineer",
            careerGoals: "",
            preferredWorkMode: "Hybrid",
            updatedAt: new Date().toISOString()
        };

        this.save();
        return newUser;
    }

    verifyPassword(user, password) {
        if (!user || !user.passwordHash) return false;
        return bcrypt.compareSync(password, user.passwordHash);
    }

    // --- Profiles ---
    getProfile(userId) {
        if (!this.data.profiles[userId]) {
            const user = this.findUserById(userId);
            this.data.profiles[userId] = {
                userId,
                fullName: user ? user.name : "Student",
                college: "",
                course: "",
                year: "",
                gpa: "",
                skills: "",
                interests: "",
                placeOfInterest: "Bangalore / Remote",
                targetRole: "Software Engineer",
                careerGoals: "",
                preferredWorkMode: "Hybrid",
                updatedAt: new Date().toISOString()
            };
            this.save();
        }
        return this.data.profiles[userId];
    }

    updateProfile(userId, profileData) {
        const existing = this.getProfile(userId);
        this.data.profiles[userId] = {
            ...existing,
            ...profileData,
            userId,
            updatedAt: new Date().toISOString()
        };

        // Also update name on user record if changed
        if (profileData.fullName) {
            const user = this.findUserById(userId);
            if (user) user.name = profileData.fullName;
        }

        this.save();
        return this.data.profiles[userId];
    }

    // --- Achievements / Vault ---
    getAchievements(userId) {
        return this.data.achievements.filter(a => a.userId === userId);
    }

    addAchievement(userId, achievement) {
        const item = {
            id: Date.now(),
            userId,
            type: achievement.type || "Certification",
            name: achievement.name,
            organization: achievement.organization,
            year: achievement.year,
            fileName: achievement.fileName || "Certificate.pdf",
            createdAt: new Date().toISOString()
        };
        this.data.achievements.push(item);
        this.save();
        return item;
    }

    deleteAchievement(userId, id) {
        const initialLen = this.data.achievements.length;
        this.data.achievements = this.data.achievements.filter(
            a => !(a.userId === userId && String(a.id) === String(id))
        );
        this.save();
        return this.data.achievements.length < initialLen;
    }

    // --- Opportunities ---
    getOpportunities(filterCategory, search) {
        let list = this.data.opportunities;
        if (filterCategory && filterCategory !== "All") {
            list = list.filter(o => o.category.toLowerCase() === filterCategory.toLowerCase());
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.title.toLowerCase().includes(q) ||
                o.domain.toLowerCase().includes(q) ||
                (o.location && o.location.toLowerCase().includes(q)) ||
                (o.description && o.description.toLowerCase().includes(q))
            );
        }
        return list;
    }

    getOpportunityById(id) {
        return this.data.opportunities.find(o => o.id === id || o.title.toLowerCase() === id.toLowerCase()) || null;
    }

    // --- Applications ---
    createApplication(userId, applicationData) {
        const app = {
            id: "app-" + Date.now(),
            userId,
            opportunityTitle: applicationData.opportunityTitle,
            applicantName: applicationData.applicantName,
            email: applicationData.email,
            college: applicationData.college,
            skills: applicationData.skills,
            coverNote: applicationData.coverNote || "",
            status: "Submitted",
            submittedAt: new Date().toISOString()
        };
        this.data.applications.push(app);
        this.save();
        return app;
    }

    getApplications(userId) {
        return this.data.applications.filter(a => a.userId === userId);
    }

    // --- Projects ---
    getProjects(category) {
        let list = this.data.projects;
        if (category && category !== "All") {
            list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        return list;
    }

    addProject(userId, projectData) {
        const user = this.findUserById(userId);
        const item = {
            id: "proj-" + Date.now(),
            userId,
            authorName: user ? user.name : "Campus Innovator",
            title: projectData.title,
            description: projectData.description,
            category: projectData.category || "Generative AI",
            tags: Array.isArray(projectData.tags) ? projectData.tags : (projectData.tags || "").split(",").map(t => t.trim()).filter(Boolean),
            demoUrl: projectData.demoUrl || "https://github.com",
            githubUrl: projectData.githubUrl || "https://github.com",
            createdAt: new Date().toISOString()
        };
        this.data.projects.unshift(item);
        this.save();
        return item;
    }

    // --- Guidance History ---
    saveGuidanceHistory(userId, query, result) {
        const item = {
            id: "guide-" + Date.now(),
            userId,
            query,
            result,
            createdAt: new Date().toISOString()
        };
        this.data.guidanceHistory.unshift(item);
        if (this.data.guidanceHistory.length > 50) {
            this.data.guidanceHistory = this.data.guidanceHistory.slice(0, 50);
        }
        this.save();
        return item;
    }

    // --- Config ---
    // --- Config (Groq key is managed strictly via .env) ---
    getCustomGroqKey() {
        return "";
    }

    setCustomGroqKey() {
        return false;
    }
}

module.exports = new Database();
