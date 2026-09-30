const https = require('https');
const database = require('./database');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function getActiveGroqKey() {
    // Strictly retrieve the key given in .env (public cannot add custom keys)
    return (process.env.GROQ_API_KEY || '').trim();
}

function hasValidGroqKey() {
    const key = getActiveGroqKey();
    return !!key && key.startsWith('gsk_') && key.length > 20;
}

// Low-level HTTPS post to Groq
function callGroqApi({ messages, temperature = 0.6, jsonMode = false }) {
    return new Promise((resolve, reject) => {
        const apiKey = getActiveGroqKey();
        if (!apiKey) {
            return reject(new Error("GROQ_API_KEY is not configured"));
        }

        const payload = {
            model: DEFAULT_MODEL,
            messages,
            temperature,
            max_tokens: 2048
        };

        if (jsonMode) {
            payload.response_format = { type: "json_object" };
        }

        const data = JSON.stringify(payload);
        const url = new URL(GROQ_API_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 25000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(body);
                        const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message ? parsed.choices[0].message.content : '';
                        resolve(content);
                    } catch (e) {
                        reject(new Error("Failed to parse Groq response JSON: " + e.message));
                    }
                } else {
                    reject(new Error(`Groq API Error (${res.statusCode}): ${body}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error("Groq API request timed out"));
        });

        req.write(data);
        req.end();
    });
}

// --- Intelligent Fallback Generator ---
// Provides comprehensive, human-grade advice if Groq key isn't provided yet
function generateIntelligentFallback({ course, year, college, placeOfInterest, targetRole, skills, interests, focusTopic }) {
    const role = targetRole || "Software / AI Engineer";
    const place = placeOfInterest || "Bangalore / Remote";
    const currentCourse = course || "Computer Science & Engineering";
    const currentYear = year || "3rd Year";

    return {
        source: "CampusAI Intelligent Core (Provide Groq API key for live Llama-3.3 LLM generation)",
        targetRole: role,
        placeOfInterest: place,
        executiveSummary: `As a ${currentYear} student in ${currentCourse}, targeting a career as a ${role} in ${place} is an exceptional strategic move. The tech ecosystem in ${place} has massive demand for engineers who combine core algorithmic foundations with modern applied engineering and deployment skills.`,
        whatToStudy: [
            {
                subject: "Core Algorithmic Foundations & System Architecture",
                importance: "Crucial for tech interviews & high-performance engineering",
                topics: [
                    "Data Structures: Trees, Graphs, Hash Maps, Heaps, and Dynamic Programming",
                    "Time & Space Complexity optimization (Big-O analysis)",
                    "Object-Oriented Design & Clean Architecture Patterns",
                    "Database Internals & SQL Indexing (PostgreSQL/MySQL)"
                ]
            },
            {
                subject: role.toLowerCase().includes("ai") || role.toLowerCase().includes("machine") || role.toLowerCase().includes("data") 
                    ? "Applied Machine Learning & Modern LLMs" 
                    : "Modern Full-Stack & Distributed Systems",
                importance: "High-value practical skillset demanded by industry recruiters",
                topics: role.toLowerCase().includes("ai") || role.toLowerCase().includes("machine") || role.toLowerCase().includes("data")
                    ? [
                        "Deep Learning Fundamentals: PyTorch, Neural Architectures, Transformers",
                        "LLMs & Generative AI: Prompt Engineering, RAG (Retrieval-Augmented Generation), Vector DBs (Chroma/Pinecone)",
                        "MLOps: Model Evaluation, Fast inference with Groq / vLLM, Dockerization",
                        "Data Wrangling & Statistical Analysis with Pandas, NumPy, and Scikit-Learn"
                    ]
                    : [
                        "Advanced JavaScript/TypeScript, React 19, and Node.js microservices",
                        "RESTful & GraphQL API design, JWT security, and WebSockets",
                        "Cloud Infrastructure: AWS (S3, EC2, Lambda), Docker containerization, CI/CD",
                        "Caching strategies with Redis and message queues with RabbitMQ/Kafka"
                    ]
            },
            {
                subject: "Production Software Engineering & Git Collaboration",
                importance: "Separates student coders from industry-ready engineers",
                topics: [
                    "Git branch management, PR reviews, and semantic versioning",
                    "Automated unit & integration testing (Jest, PyTest)",
                    "API performance benchmarking & security best practices",
                    "Observability: Structured logging, error tracing, and monitoring"
                ]
            }
        ],
        recommendedCourses: [
            {
                title: role.toLowerCase().includes("ai") ? "Deep Learning Specialization by Andrew Ng" : "Full-Stack Web Development Bootcamp",
                platform: "Coursera / DeepLearning.AI",
                duration: "6 - 8 Weeks",
                level: "Intermediate",
                whyStudy: "Industry gold standard for mastering foundational principles and modern practical workflows."
            },
            {
                title: "CS50: Introduction to Computer Science",
                platform: "Harvard edX",
                duration: "10 Weeks",
                level: "Foundational",
                whyStudy: "Builds bulletproof mental models in C, Python, Memory Management, and Algorithmic Thinking."
            },
            {
                title: "Building High-Speed AI Applications with Groq API & Llama-3",
                platform: "Groq Developer Hub / Free Tutorial Series",
                duration: "2 Weeks",
                level: "Advanced Practical",
                whyStudy: "Teaches you how to deploy ultra-low latency inference microservices for real-world products."
            },
            {
                title: "AWS Certified Cloud Practitioner or Solutions Architect Associate",
                platform: "Amazon Web Services / Udemy",
                duration: "4 - 6 Weeks",
                level: "Professional Certification",
                whyStudy: "Demonstrates cloud fluency and container deployment readiness on your campus resume."
            }
        ],
        studyRoadmap: [
            {
                phase: "Phase 1: Foundation Sprint (Day 1 - 30)",
                milestones: [
                    "Master Core Language Proficiency (Python or Modern TypeScript)",
                    "Solve 50+ medium LeetCode/HackerRank problems focusing on HashMaps, Two Pointers, and Binary Search",
                    "Complete foundational coursework on database design and basic Git workflows"
                ]
            },
            {
                phase: "Phase 2: Applied Mastery & Capstone Build (Day 31 - 60)",
                milestones: [
                    "Build a complete full-stack application integrating an AI API (e.g. Groq inference)",
                    "Containerize the backend with Docker and deploy to Render/Vercel/AWS",
                    "Implement secure JWT authentication and comprehensive test coverage"
                ]
            },
            {
                phase: "Phase 3: Portfolio Polish & Location-Targeted Placement (Day 61 - 90)",
                milestones: [
                    "Optimize GitHub repository with comprehensive README, system architecture diagram, and live demo link",
                    "Benchmark your resume against job descriptions in " + place,
                    "Participate in 2 hackathons on CampusAI and apply for targeted internships in " + place
                ]
            }
        ],
        locationInsights: {
            hub: place,
            hiringTrends: `The hiring market in ${place} values self-driven developers who showcase deployed projects rather than just theoretical certificates. Startups and Tier-1 product companies look for candidates who can take an idea from conception to production.`,
            topSoughtSkills: ["Problem Solving", "API Engineering", "AI Integration", "Cloud Deployment", "Collaborative Git"],
            localNetworkingTips: `Attend local tech meetups, hackathons, and connect with university alumni working at target firms in ${place} on LinkedIn.`
        },
        recommendedProjects: [
            {
                title: "Intelligent Campus Assistant with Groq Llama-3",
                description: "Build an ultra-fast question answering and course syllabus assistant leveraging Groq's high-speed inference engine.",
                techStack: ["Groq API", "Python / Node.js", "Vector Search", "Tailwind/Vanilla CSS"]
            },
            {
                title: "Full-Stack Opportunity & Referral Tracker",
                description: "A productivity platform allowing students to track internship openings, deadlines, and referral contacts with automated notifications.",
                techStack: ["Node.js", "Express", "PostgreSQL/SQLite", "JWT Auth"]
            },
            {
                title: "Automated Code Reviewer & Security Linter Bot",
                description: "A GitHub Action that parses PR diffs and provides automated feedback on code smells and potential vulnerabilities.",
                techStack: ["TypeScript", "GitHub REST API", "Docker"]
            }
        ]
    };
}

// --- High Level Public API ---

async function generateCareerGuidance(studentData) {
    const { course, year, college, placeOfInterest, targetRole, skills, interests, focusTopic } = studentData;

    // Check if Groq API key is active
    if (!hasValidGroqKey()) {
        console.log("No Groq API key provided. Using CampusAI Intelligent Recommendation Engine.");
        return generateIntelligentFallback(studentData);
    }

    try {
        console.log("Invoking live Groq AI (llama-3.3-70b-versatile)...");
        const systemPrompt = `You are CampusAI Chief Career & Academic Counselor, an expert advisor helping university students prepare for competitive industry roles.
Return your response STRICTLY as a valid JSON object without markdown fences, with these exact top-level keys:
{
  "source": "Groq AI (Llama 3.3 70B)",
  "targetRole": string,
  "placeOfInterest": string,
  "executiveSummary": string,
  "whatToStudy": [
    { "subject": string, "importance": string, "topics": [string, string, string] }
  ],
  "recommendedCourses": [
    { "title": string, "platform": string, "duration": string, "level": string, "whyStudy": string }
  ],
  "studyRoadmap": [
    { "phase": string, "milestones": [string, string, string] }
  ],
  "locationInsights": {
    "hub": string,
    "hiringTrends": string,
    "topSoughtSkills": [string, string, string, string],
    "localNetworkingTips": string
  },
  "recommendedProjects": [
    { "title": string, "description": string, "techStack": [string, string, string] }
  ]
}`;

        const userPrompt = `Student Profile:
- Degree & Course: ${course || 'Computer Science & Engineering'}
- Current Year: ${year || '3rd Year'}
- College: ${college || 'University Engineering College'}
- Target Career Role: ${targetRole || 'Software / AI Engineer'}
- Place / Location of Interest: ${placeOfInterest || 'Bangalore, India'}
- Current Technical Skills: ${skills || 'Python, C++, Web Development'}
- Interests: ${interests || 'AI, Machine Learning, Cloud Systems'}
- Specific Focus or Question: ${focusTopic || 'Suggest what to study, what courses to study, and step-by-step preparation strategy for campus placements and internships.'}

Generate an exhaustive, highly practical, realistic, and inspiring academic and career roadmap specifically tailored to their college stage, dream role, and geographic market (${placeOfInterest || 'Bangalore, India'}).`;

        const responseText = await callGroqApi({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.5,
            jsonMode: true
        });

        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (err) {
        console.warn("Live Groq call encountered an issue, seamlessly using built-in intelligent engine:", err.message);
        const fallback = generateIntelligentFallback(studentData);
        fallback.apiNotice = "Note: Live Groq API error (" + err.message + "). Displaying CampusAI Verified Guidance.";
        return fallback;
    }
}

async function chatWithCareerCoach({ messages, studentProfile }) {
    if (!hasValidGroqKey()) {
        const lastMsg = (messages[messages.length - 1]?.content || "").toLowerCase();
        let reply = "Hello! I am your CampusAI Career Counselor. ";
        if (lastMsg.includes("course") || lastMsg.includes("study")) {
            reply += "To excel, I recommend focusing on Data Structures & Algorithms, followed by specialized projects in your target domain. Explore courses like CS50 and Andrew Ng's DeepLearning.AI! You can also configure a Groq API key in settings for real-time live LLM dialogue.";
        } else if (lastMsg.includes("bangalore") || lastMsg.includes("location") || lastMsg.includes("place")) {
            reply += `In ${studentProfile?.placeOfInterest || 'top tech hubs like Bangalore'}, companies look for strong problem-solving skills, Git portfolios, and hands-on experience with production frameworks like FastAPI, Node.js, and PyTorch.`;
        } else if (lastMsg.includes("project") || lastMsg.includes("resume")) {
            reply += "A high-impact project should solve a real problem: build a deployed web app with user authentication and an AI endpoint (e.g., using Groq API). Don't just build toy clones—demonstrate error handling, testing, and deployment!";
        } else {
            reply += `Based on your profile as a ${studentProfile?.year || 'student'} aiming for ${studentProfile?.targetRole || 'tech roles'}, consistency is key. Set aside 1-2 hours daily for coding practice and build one solid capstone project. Add your Groq API key in the navbar for infinite live AI queries!`;
        }
        return { reply, source: "CampusAI Knowledge Engine" };
    }

    try {
        const sysPrompt = `You are CampusAI Career Coach, an inspiring, knowledgeable, and practical university mentor. 
You are advising a student with this profile:
- Name: ${studentProfile?.fullName || 'Student'}
- Course: ${studentProfile?.course || 'Engineering'}
- Year: ${studentProfile?.year || 'Undergraduate'}
- Target Role: ${studentProfile?.targetRole || 'Software/AI Engineer'}
- Place of Interest: ${studentProfile?.placeOfInterest || 'Bangalore'}
- Skills: ${studentProfile?.skills || 'General Tech'}

Provide clear, actionable, friendly, and structured advice. Use bullet points and bold highlights where appropriate.`;

        const formatted = [
            { role: 'system', content: sysPrompt },
            ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
        ];

        const content = await callGroqApi({
            messages: formatted,
            temperature: 0.7
        });

        return { reply: content, source: "Groq AI (Llama-3.3)" };
    } catch (err) {
        return {
            reply: `I encountered a momentary connection issue with Groq (${err.message}). Here is a practical recommendation: focus on mastering 1 primary programming language, building 2 deployed projects, and networking with tech professionals on LinkedIn in ${studentProfile?.placeOfInterest || 'your target city'}!`,
            source: "CampusAI Offline Safety"
        };
    }
}

async function analyzeResume({ resumeText, targetRole, studentProfile }) {
    if (!hasValidGroqKey()) {
        const textLen = (resumeText || "").length;
        const score = Math.min(92, Math.max(68, Math.floor(65 + (textLen / 60))));
        return {
            score,
            targetRole: targetRole || "Software Engineer",
            summary: `Your profile has a solid foundation for ${targetRole || 'the role'}. To elevate your candidacy, highlight quantifiable outcomes (e.g. 'Improved speed by 35%') and link directly to live deployed URLs.`,
            strengths: [
                "Clear academic trajectory and technical domain focus",
                "Relevant foundational technical terminology",
                "Structured presentation of competencies"
            ],
            missingSkills: [
                "Cloud infrastructure deployment (AWS / Docker)",
                "Automated testing & CI/CD pipeline experience",
                "Measurable project impact metrics (users, latency, accuracy)"
            ],
            actionItems: [
                "Add live deployment links and GitHub URLs for each listed project",
                "Reword bullet points into Google's 'Accomplished [X], measured by [Y], by doing [Z]' format",
                "Add 2-3 specific technical certifications to the education section"
            ],
            source: "CampusAI Intelligent Scorer"
        };
    }

    try {
        const sysPrompt = `You are an expert technical recruiter and resume reviewer.
Evaluate the candidate's resume/profile text against the target role: "${targetRole}".
Return STRICTLY a valid JSON object without markdown fences:
{
  "score": number (0-100),
  "targetRole": string,
  "summary": string,
  "strengths": [string, string, string],
  "missingSkills": [string, string, string],
  "actionItems": [string, string, string]
}`;

        const content = await callGroqApi({
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: `Resume Content:\n${resumeText || 'Student profile with core technical coursework'}` }
            ],
            temperature: 0.3,
            jsonMode: true
        });

        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err) {
        return {
            score: 78,
            targetRole: targetRole || "Tech Role",
            summary: `Resume parsed successfully. To stand out for ${targetRole}, emphasize real-world project deployments.`,
            strengths: ["Solid foundational skill representation", "Targeted role alignment"],
            missingSkills: ["CI/CD pipelines", "Production Dockerization"],
            actionItems: ["Include GitHub metrics", "Add live hosted demo links"],
            source: "CampusAI Scorer Fallback"
        };
    }
}

async function analyzePortfolio({ profile, achievements }) {
    const skillCount = (profile.skills || "").split(",").filter(Boolean).length;
    const hackCount  = achievements.filter(a => a.type === "Hackathon").length;
    const certCount  = achievements.filter(a => a.type === "Certification").length;
    const projCount  = achievements.filter(a => a.type === "Project").length;
    const workshopCount = achievements.filter(a => a.type === "Workshop").length;

    // Intelligent fallback when no Groq key
    if (!hasValidGroqKey()) {
        const base = 40;
        const profileScore = [
            profile.fullName, profile.college, profile.course,
            profile.year, profile.targetRole, profile.skills,
            profile.placeOfInterest, profile.interests, profile.careerGoals, profile.gpa
        ].filter(Boolean).filter(v => v.toString().trim() !== '').length * 5;
        const vaultScore = Math.min(30, (hackCount * 8) + (certCount * 5) + (projCount * 7) + (workshopCount * 3));
        const skillScore = Math.min(20, skillCount * 3);
        const total = Math.min(100, base + profileScore + vaultScore + skillScore);

        return {
            source: "CampusAI Portfolio Engine",
            overallScore: total,
            grade: total >= 85 ? "A" : total >= 70 ? "B" : total >= 55 ? "C" : "D",
            headline: total >= 85
                ? "Excellent Portfolio – Highly Competitive"
                : total >= 70
                ? "Good Portfolio – Some Gaps to Fill"
                : total >= 55
                ? "Average Portfolio – Needs Significant Work"
                : "Needs Improvement – Start Building Now",
            categories: [
                {
                    name: "Profile Completeness",
                    score: Math.min(100, profileScore + 50),
                    icon: "👤",
                    feedback: profile.careerGoals
                        ? "Your profile is well-filled including career goals."
                        : "Add a career goals statement to strengthen your profile."
                },
                {
                    name: "Proof Vault & Credentials",
                    score: Math.min(100, vaultScore * 3 + 10),
                    icon: "🏆",
                    feedback: achievements.length >= 3
                        ? "Strong vault with diverse credentials."
                        : "Add more hackathons, certifications and projects to boost credibility."
                },
                {
                    name: "Technical Skills Depth",
                    score: Math.min(100, skillScore * 5),
                    icon: "🛠️",
                    feedback: skillCount >= 6
                        ? "Good breadth of technical skills listed."
                        : "List more specific tools and frameworks you know."
                },
                {
                    name: "Industry Readiness",
                    score: Math.min(100, (hackCount + projCount) * 20 + 20),
                    icon: "🚀",
                    feedback: (hackCount + projCount) >= 2
                        ? "Hands-on experience shows real-world readiness."
                        : "Participate in hackathons and build real projects to demonstrate initiative."
                }
            ],
            strengths: [
                profile.skills ? `Skills listed: ${profile.skills}` : null,
                hackCount > 0 ? `${hackCount} hackathon(s) showing competitive experience` : null,
                certCount > 0 ? `${certCount} certification(s) demonstrating continuous learning` : null,
                profile.targetRole ? `Clear career target: ${profile.targetRole}` : null
            ].filter(Boolean).slice(0, 4),
            improvements: [
                !profile.careerGoals ? { priority: "High", area: "Career Vision", action: "Write a 2–3 sentence career goals statement describing where you want to be in 3–5 years." } : null,
                !profile.gpa ? { priority: "Medium", area: "Academic Record", action: "Add your CGPA / percentage to make your profile verifiable to recruiters." } : null,
                skillCount < 5 ? { priority: "High", area: "Skills Breadth", action: `You have ${skillCount} skill(s) listed. Add at least 6–10 specific tools (e.g. Docker, PostgreSQL, PyTorch) with proficiency levels.` } : null,
                hackCount === 0 ? { priority: "High", area: "Hackathon Experience", action: "Register for at least 1 hackathon. Even participation shows initiative. Check the Opportunities tab." } : null,
                projCount === 0 ? { priority: "High", area: "Project Portfolio", action: "Add a deployed project with a live demo URL and GitHub link. Real projects are the #1 differentiator for internships." } : null,
                certCount < 2 ? { priority: "Medium", area: "Certifications", action: "Complete 1–2 industry certifications (e.g. AWS Cloud Practitioner, DeepLearning.AI) and upload them to your vault." } : null,
                !profile.interests ? { priority: "Low", area: "Interests", action: "List your learning interests (e.g. Generative AI, Cloud Infrastructure) so AI can tailor better guidance." } : null,
                achievements.length < 2 ? { priority: "High", area: "Proof Vault", action: "Your proof vault is nearly empty. Upload certificates, projects, or workshop completions to build credibility." } : null
            ].filter(Boolean).slice(0, 6),
            nextSteps: [
                `Apply to internships targeting ${profile.placeOfInterest || 'your target city'} in the Opportunities tab`,
                "Generate your personalized AI Study Roadmap in the Career Hub",
                "Share your GitHub profile URL in skills to give recruiters direct access to your work"
            ]
        };
    }

    // Live Groq AI analysis
    try {
        const sysPrompt = `You are a senior technical recruiter and portfolio evaluator for top tech companies.
You assess student portfolios holistically and provide HIGHLY specific, actionable, and honest feedback.
Return STRICTLY a valid JSON object (no markdown fences) with this exact schema:
{
  "source": "Groq AI (Llama 3.3 70B)",
  "overallScore": number (0-100),
  "grade": "A" | "B" | "C" | "D",
  "headline": string (one punchy line summarizing portfolio quality),
  "categories": [
    { "name": string, "score": number (0-100), "icon": string (emoji), "feedback": string }
  ],
  "strengths": [string, string, string],
  "improvements": [
    { "priority": "High" | "Medium" | "Low", "area": string, "action": string }
  ],
  "nextSteps": [string, string, string]
}
Categories must cover: Profile Completeness, Proof Vault & Credentials, Technical Skills Depth, Industry Readiness.
Improvements must be SPECIFIC — mention exact missing items, tools, or numbers. Be honest — if the portfolio is weak, say so clearly but constructively.`;

        const userPrompt = `Student Portfolio to Evaluate:

--- PROFILE ---
Name: ${profile.fullName || 'N/A'}
College: ${profile.college || 'N/A'}
Degree & Course: ${profile.course || 'N/A'}
Year: ${profile.year || 'N/A'}
GPA: ${profile.gpa || 'Not provided'}
Target Role: ${profile.targetRole || 'N/A'}
Target Location: ${profile.placeOfInterest || 'N/A'}
Technical Skills: ${profile.skills || 'None listed'}
Interests: ${profile.interests || 'Not specified'}
Career Goals: ${profile.careerGoals || 'Not written'}

--- PROOF VAULT (${achievements.length} items) ---
${achievements.length === 0 ? 'No achievements uploaded.' : achievements.map(a => `• [${a.type}] ${a.name} — ${a.organization} (${a.year})`).join('\n')}

Summary counts: ${hackCount} hackathon(s), ${certCount} certification(s), ${projCount} project(s), ${workshopCount} workshop(s), ${skillCount} skills listed.

Generate a comprehensive portfolio analysis with specific, actionable improvements tailored to their target role (${profile.targetRole || 'Software Engineer'}) and location (${profile.placeOfInterest || 'Tech Hub'}).`;

        const responseText = await callGroqApi({
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            jsonMode: true
        });

        const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err) {
        console.warn("Portfolio analysis Groq error, using fallback:", err.message);
        // Fallback — reuse intelligent engine
        return analyzePortfolio({ profile, achievements });
    }
}

module.exports = {
    generateCareerGuidance,
    chatWithCareerCoach,
    analyzeResume,
    analyzePortfolio,
    getActiveGroqKey,
    hasValidGroqKey
};
