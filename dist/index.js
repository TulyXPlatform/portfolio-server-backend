"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const db_1 = require("./db");
// Models
const User_1 = __importDefault(require("./models/User"));
const Project_1 = __importDefault(require("./models/Project"));
const Skill_1 = __importDefault(require("./models/Skill"));
const BlogPost_1 = __importDefault(require("./models/BlogPost"));
const Experience_1 = __importDefault(require("./models/Experience"));
const Message_1 = __importDefault(require("./models/Message"));
const SocialLink_1 = __importDefault(require("./models/SocialLink"));
const Setting_1 = __importDefault(require("./models/Setting"));
const Visitor_1 = __importDefault(require("./models/Visitor"));
dotenv_1.default.config();
// connect to database (returns a promise so we can hook into it)
(0, db_1.connectDB)().then(() => __awaiter(void 0, void 0, void 0, function* () {
    // if you've set SEED_DB=true (e.g. on Render one‑off or locally), run seeder
    if (process.env.SEED_DB === "true") {
        try {
            const seedModule = yield Promise.resolve().then(() => __importStar(require("./seed")));
            if (seedModule.seedData) {
                console.log("[DB] seeding because SEED_DB=true");
                yield seedModule.seedData().catch(err => console.error("Seed error:", err));
            }
        }
        catch (err) {
            console.error("Failed to load seed module:", err);
        }
    }
}));
const app = (0, express_1.default)();
const JWT_SECRET = process.env.JWT_SECRET;
// Configure CORS to allow requests from deployed Vercel frontends
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://localhost:5173",
    "https://localhost:5174",
    process.env.PORTFOLIO_URL || "",
    process.env.ADMIN_URL || ""
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log(`Blocked by CORS: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Content Security Policy (CSP) header — adjust origins as needed.
app.use((req, res, next) => {
    const csp = [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "img-src 'self' data: blob: https://cdn.jsdelivr.net",
        "connect-src 'self' http://localhost:5000 ws://localhost:5175 https://api.ipify.org https://ip-api.com",
        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
        "frame-src 'none'"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
    next();
});
// uploads
const uploadsDir = path_1.default.join(__dirname, "..", "uploads");
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express_1.default.static(uploadsDir));
const storage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage });
// auth middleware
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        jsonwebtoken_1.default.verify(token, JWT_SECRET);
        next();
    }
    catch (_b) {
        res.status(401).json({ error: "Invalid token" });
    }
};
// visitor tracker
const trackVisitor = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const ip = ((_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) ||
            req.socket.remoteAddress;
        if (!ip)
            return;
        //the const geo line sometimes fails  on render. then we have to use this line instead of that
        /*if (ip === "127.0.0.1" || ip === "::1") return;*/
        const geo = yield axios_1.default.get(`http://ip-api.com/json/${ip}`);
        const ua = req.headers["user-agent"] || "";
        const browser = ua.includes("Chrome") ? "Chrome"
            : ua.includes("Firefox") ? "Firefox"
                : ua.includes("Safari") ? "Safari"
                    : "Other";
        const os = ua.includes("Windows") ? "Windows"
            : ua.includes("Mac") ? "macOS"
                : ua.includes("Linux") ? "Linux"
                    : "Other";
        yield Visitor_1.default.create({
            ipAddress: ip,
            country: geo.data.country,
            countryCode: geo.data.countryCode,
            city: geo.data.city,
            region: geo.data.regionName,
            isp: geo.data.isp,
            userAgent: ua,
            browser,
            os
        });
    }
    catch (_b) { }
});
/* ================= PUBLIC ================= */
app.get("/api/portfolio", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[API] GET /api/portfolio from ${req.ip} origin=${req.headers.origin} host=${req.headers.host}`);
    trackVisitor(req);
    try {
        const [socialLinks, projects, skills, posts, experiences, settings] = yield Promise.all([
            SocialLink_1.default.find(),
            Project_1.default.find().sort({ createdAt: -1 }),
            Skill_1.default.find(),
            BlogPost_1.default.find().select("title summary coverImage createdAt"),
            Experience_1.default.find(),
            Setting_1.default.findOne({ keyName: "cvLink" })
        ]);
        res.json({
            socialLinks,
            projects,
            skills,
            posts,
            experiences,
            cvLink: (settings === null || settings === void 0 ? void 0 : settings.value) || "/cv.pdf"
        });
    }
    catch (err) {
        console.error('[API] /api/portfolio error', err);
        res.status(500).json({ error: 'Server error' });
    }
}));
// root info
app.get('/', (_req, res) => {
    res.send('Portfolio API — use /api/portfolio');
});
app.get("/api/projects/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield Project_1.default.findById(req.params.id);
    if (!project)
        return res.status(404).json({ error: "Not found" });
    res.json(project);
}));
app.get("/api/posts/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield BlogPost_1.default.findById(req.params.id);
    if (!post)
        return res.status(404).json({ error: "Not found" });
    res.json(post);
}));
app.post("/api/messages", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Message_1.default.create(req.body);
    res.json({ success: true });
}));
/* ================= LOGIN ================= */
app.post("/api/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const user = yield User_1.default.findOne({ username, password });
    if (!user)
        return res.status(401).json({ error: "Invalid credentials" });
    const token = jsonwebtoken_1.default.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token });
}));
/* ================= ADMIN CRUD ================= */
app.get("/api/admin/projects", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield Project_1.default.find().sort({ createdAt: -1 }));
}));
app.post("/api/admin/projects", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Project_1.default.create(req.body);
    res.json({ success: true });
}));
app.put("/api/admin/projects/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Project_1.default.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
}));
app.delete("/api/admin/projects/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Project_1.default.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));
// Skills
app.get("/api/admin/skills", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield Skill_1.default.find());
}));
app.post("/api/admin/skills", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Skill_1.default.create(req.body);
    res.json({ success: true });
}));
app.put("/api/admin/skills/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Skill_1.default.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
}));
app.delete("/api/admin/skills/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Skill_1.default.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));
// Experiences
app.get("/api/admin/experiences", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield Experience_1.default.find());
}));
app.post("/api/admin/experiences", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Experience_1.default.create(req.body);
    res.json({ success: true });
}));
app.put("/api/admin/experiences/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Experience_1.default.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
}));
app.delete("/api/admin/experiences/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Experience_1.default.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));
// Blog posts
app.get("/api/admin/posts", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield BlogPost_1.default.find());
}));
app.post("/api/admin/posts", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield BlogPost_1.default.create(req.body);
    res.json({ success: true });
}));
app.put("/api/admin/posts/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield BlogPost_1.default.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
}));
app.delete("/api/admin/posts/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield BlogPost_1.default.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));
// Social
app.get("/api/admin/social", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield SocialLink_1.default.find());
}));
app.post("/api/admin/social", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield SocialLink_1.default.create(req.body);
    res.json({ success: true });
}));
app.put("/api/admin/social/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield SocialLink_1.default.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
}));
app.delete("/api/admin/social/:id", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield SocialLink_1.default.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));
// Settings
app.get("/api/admin/settings", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield Setting_1.default.find());
}));
app.put("/api/admin/settings/:key", authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Setting_1.default.findOneAndUpdate({ keyName: req.params.key }, { value: req.body.value }, { upsert: true });
    res.json({ success: true });
}));
// Analytics
app.get("/api/admin/analytics", authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const total = yield Visitor_1.default.countDocuments();
    const today = yield Visitor_1.default.countDocuments({
        visitedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const byCountry = yield Visitor_1.default.aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    res.json({ total, today, byCountry });
}));
// Upload
app.post("/api/upload", authMiddleware, upload.single("file"), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "No file" });
    res.json({ url: `/uploads/${req.file.filename}` });
});
// server
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});
