import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";

import { connectDB } from "./db";

// Models
import User from "./models/User";
import Project from "./models/Project";
import Skill from "./models/Skill";
import BlogPost from "./models/BlogPost";
import Experience from "./models/Experience";
import Message from "./models/Message";
import SocialLink from "./models/SocialLink";
import Setting from "./models/Setting";
import Visitor from "./models/Visitor";

dotenv.config();

// connect to database (returns a promise so we can hook into it)
connectDB().then(async () => {
  // if you've set SEED_DB=true (e.g. on Render one‑off or locally), run seeder
  if (process.env.SEED_DB === "true") {
    try {
      const seedModule = await import("./seed") as { seedData?: () => Promise<void> };
      if (seedModule.seedData) {
        console.log("[DB] seeding because SEED_DB=true");
        await seedModule.seedData().catch(err => console.error("Seed error:", err));
      }
    } catch (err) {
      console.error("Failed to load seed module:", err);
    }
  } else {
    // if no users exist at all, create a default admin account so the panel can be accessed
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log("[DB] no users found, creating default admin");
        await User.create({ username: 'admin', password: 'admin123' });
      }
    } catch (err) {
      console.error("Error checking/creating default admin:", err);
    }
  }
});

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET not set; using default. Set JWT_SECRET in env for production.");
}

// Configure CORS to allow requests from deployed frontends and localhost during dev
const allowedOrigins = [
  process.env.PORTFOLIO_URL || "",
  process.env.ADMIN_URL || ""
].filter(Boolean);
console.log('[CORS] allowed origins:', allowedOrigins.length ? allowedOrigins.join(', ') : '(none)');

// CORS configuration with proper preflight handling
app.use(cors({
  origin: (origin, callback) => {
    // Allow no origin (e.g., mobile, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow localhost/* for development (any port)
    if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:")) {
      callback(null, true);
      return;
    }

    // If no origins were configured, open up access (useful for quick deploys)
    if (allowedOrigins.length === 0) {
      console.warn('[CORS] no allowed origins configured, permitting any origin');
      callback(null, true);
      return;
    }

    // check for exact or prefix (ignore trailing slash mismatches)
    const match = allowedOrigins.some(o => {
      if (o === origin) return true;
      // drop trailing slash from configured origin for comparison
      const norm = o.endsWith('/') ? o.slice(0, -1) : o;
      const origNorm = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      return origNorm === norm;
    });
    if (match) {
      callback(null, true);
      return;
    }

    console.log(`[CORS] blocked origin: ${origin}. allowed: ${allowedOrigins.join(', ')}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 3600
}));

app.use(express.json());

// simple request logger for debugging deployments
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl} from ${req.ip} origin=${req.headers.origin}`);
  next();
});

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
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// auth middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// visitor tracker
const trackVisitor = async (req: Request) => {
  try {
    // Extract IP more reliably (supports proxy and IPv6 mapping)
    const rawIp = req.ip || 
                 (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
                 req.socket.remoteAddress || 
                 "";
    
    // Normalize IP (strip IPv6 mapping if present)
    let ip = rawIp.replace(/^.*:([^:]+)$/, '$1');
    if (ip === "1") ip = "127.0.0.1"; // Handle ::1 normalized to just 1
    if (!ip) return;

    let country = "Unknown";
    let countryCode = "UN";
    let city = "Unknown";
    let region = "Unknown";
    let isp = "Internal";

    // Detect if IP is local/private
    const isLocal = ip === "127.0.0.1" || 
                    ip === "::1" ||
                    ip.startsWith("192.168.") || 
                    ip.startsWith("10.") || 
                    ip.startsWith("172.16.");
    if (isLocal) {
      country = "Localhost";
      city = "Development";
    } else {
      try {
        const geoResult = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,regionName,isp`, { timeout: 3000 });
        if (geoResult.data.status === "success") {
          country = geoResult.data.country || "Unknown";
          countryCode = geoResult.data.countryCode || "UN";
          city = geoResult.data.city || "Unknown";
          region = geoResult.data.regionName || "Unknown";
          isp = geoResult.data.isp || "Unknown";
        }
      } catch (err) {
        console.error("[GEO] failed for", ip, err.message);
      }
    }

    const ua = req.headers["user-agent"] || "";
    
    // Improved UA detection
    let browser = "Other";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Trident")) browser = "IE";

    let os = "Other";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";

    await Visitor.create({
      ipAddress: ip,
      country,
      countryCode,
      city,
      region,
      isp,
      userAgent: ua,
      browser,
      os,
      visitedAt: new Date()
    });
  } catch (err) {
    console.error("[TRACKER] general error:", err.message);
  }
};

/* ================= PUBLIC ================= */

app.get("/api/portfolio", async (req, res) => {
  console.log(`[API] GET /api/portfolio from ${req.ip} origin=${req.headers.origin} host=${req.headers.host}`);
  trackVisitor(req);

  try {
    const [socialLinks, projects, skills, posts, experiences, settings] =
      await Promise.all([
        SocialLink.find(),
        Project.find().sort({ createdAt: -1 }),
        Skill.find(),
        BlogPost.find().select("title summary coverImage createdAt"),
        Experience.find(),
        Setting.findOne({ keyName: "cvLink" })
      ]);

    res.json({
      socialLinks: socialLinks.map(s => {
        const obj = s.toObject();
        return { ...obj, id: String(obj._id) };
      }),
      projects: projects.map(projectToResponse),
      skills: skills.map(s => {
        const obj = s.toObject();
        return { ...obj, id: String(obj._id) };
      }),
      posts: posts.map(p => {
        const obj = p.toObject();
        return { ...obj, id: String(obj._id) };
      }),
      experiences: experiences.map(e => {
        const obj = e.toObject();
        return { ...obj, id: String(obj._id) };
      }),
      cvLink: settings?.value || "/cv.pdf"
    });
  } catch (err) {
    console.error('[API] /api/portfolio error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// root info
app.get('/', (_req, res) => {
  res.send('Portfolio API — use /api/portfolio');
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Invalid ID format: " + req.params.id });
    }
    const project = await Project.findById(req.params.id).lean();
    if (!project) {
      return res.status(404).json({ error: "Project not found: " + req.params.id });
    }
    res.json(projectToResponse(project));
  } catch (err: any) {
    console.error(`[API] Error in /api/projects/:id:`, err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: "Invalid ID format" });
    }
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);
  } catch (err) {
    res.status(404).json({ error: "Not found" });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    console.log('[API] POST /api/messages', req.body);
    await Message.create(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] POST /api/messages error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`[API] login attempt for ${username}`);

  const user = await User.findOne({ username, password });
  if (!user) {
    console.log(`[API] login failed for ${username}`);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log(`[API] login success for ${username}`);
  res.json({ success: true, token });
});

/* ================= ADMIN CRUD ================= */


const normalizeTags = (tags: any): string[] => {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }
  return [];
};

const projectToResponse = (p: any) => {
  const doc = p.toObject ? p.toObject() : (p._doc || p);
  const tags = Array.isArray(doc.tags) ? doc.tags.join(',') : (doc.tags || "");
  const images = Array.isArray(doc.images) ? doc.images.join(',') : (doc.images || "");

  return {
    ...doc,
    id: String(doc._id || p._id),
    tags,
    images
  };
};

app.get("/api/admin/projects", authMiddleware, async (_req, res) => {
  try {
    const items = await Project.find().sort({ createdAt: -1 }).lean();
    console.log('[API] /api/admin/projects retrieved', items.length);
    res.json(items.map(projectToResponse));
  } catch (err) {
    console.error('[API] /api/admin/projects error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post("/api/admin/projects", authMiddleware, async (req, res) => {
  try {
    const body = { ...req.body, tags: normalizeTags(req.body.tags) };
    await Project.create(body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /api/admin/projects POST error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/admin/projects/:id", authMiddleware, async (req, res) => {
  try {
    const body = { ...req.body, tags: normalizeTags(req.body.tags) };
    await Project.findByIdAndUpdate(req.params.id, body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /api/admin/projects PUT error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete("/api/admin/projects/:id", authMiddleware, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Skills
app.get("/api/admin/skills", authMiddleware, async (_req, res) => {
  try {
    const items = await Skill.find().lean(); console.log('[API] /api/admin/skills retrieved', items); res.json(items.map(item => ({ ...item, id: item._id })));
  } catch (err) {
    console.error('[API] /api/admin/skills error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post("/api/admin/skills", authMiddleware, async (req, res) => {
  try {
    await Skill.create(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /api/admin/skills POST error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/admin/skills/:id", authMiddleware, async (req, res) => {
  try {
    await Skill.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /api/admin/skills PUT error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete("/api/admin/skills/:id", authMiddleware, async (req, res) => {
  await Skill.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Experiences
app_get_exps: app.get("/api/admin/experiences", authMiddleware, async (_req, res) => {
  try {
    const items = await Experience.find();
    console.log('[API] /api/admin/experiences retrieved', items.length);
    res.json(items.map(item => ({ ...item.toObject(), id: item._id })));
  } catch (err) {
    console.error('[API] /api/admin/experiences error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post("/api/admin/experiences", authMiddleware, async (req, res) => {
  try {
    console.log('[API] POST /api/admin/experiences', req.body);
    await Experience.create(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /api/admin/experiences POST error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/admin/experiences/:id", authMiddleware, async (req, res) => {
  await Experience.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/admin/experiences/:id", authMiddleware, async (req, res) => {
  await Experience.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Blog posts
app.get("/api/admin/posts", authMiddleware, async (_req, res) => {
  const items = await BlogPost.find();
  res.json(items.map(item => ({ ...item.toObject(), id: item._id })));
});

app.post("/api/admin/posts", authMiddleware, async (req, res) => {
  await BlogPost.create(req.body);
  res.json({ success: true });
});

app.put("/api/admin/posts/:id", authMiddleware, async (req, res) => {
  await BlogPost.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/admin/posts/:id", authMiddleware, async (req, res) => {
  await BlogPost.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Social
app.get("/api/admin/social", authMiddleware, async (_req, res) => {
  try {
    const items = await SocialLink.find();
    console.log('[API] /api/admin/social retrieved', items.length);
    res.json(items.map(item => ({ ...item.toObject(), id: item._id })));
  } catch (err) {
    console.error('[API] /api/admin/social error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post("/api/admin/social", authMiddleware, async (req, res) => {
  try {
    console.log('[API] POST /api/admin/social', req.body);
    await SocialLink.create(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[API] /api/admin/social POST error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/admin/social/:id", authMiddleware, async (req, res) => {
  await SocialLink.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/admin/social/:id", authMiddleware, async (req, res) => {
  await SocialLink.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Messages
app.get("/api/admin/messages", authMiddleware, async (_req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages.map(msg => ({ ...msg.toObject(), id: msg._id })));
});

app.delete("/api/admin/messages/:id", authMiddleware, async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Settings
app.get("/api/admin/settings", authMiddleware, async (_req, res) => {
  res.json(await Setting.find());
});

app.put("/api/admin/settings/:key", authMiddleware, async (req, res) => {
  await Setting.findOneAndUpdate(
    { keyName: req.params.key },
    { value: req.body.value },
    { upsert: true }
  );
  res.json({ success: true });
});

// Analytics
app.get("/api/admin/analytics", authMiddleware, async (_req, res) => {
  try {
    const total = await Visitor.countDocuments();
    const today = await Visitor.countDocuments({
      visitedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const [byCountry, byBrowser, byOs, recent, daily] = await Promise.all([
      Visitor.aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Visitor.aggregate([
        { $group: { _id: "$browser", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Visitor.aggregate([
        { $group: { _id: "$os", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Visitor.find().sort({ visitedAt: -1 }).limit(20).lean(),
      Visitor.aggregate([
        {
          $match: {
            visitedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$visitedAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      total,
      today,
      byCountry: byCountry.map(c => ({ country: c._id, count: c.count })),
      byBrowser: byBrowser.map(b => ({ browser: b._id, count: b.count })),
      byOs: byOs.map(o => ({ os: o._id, count: o.count })),
      recent: recent.map((v: any) => ({ ...v, id: String(v._id) })),
      daily: daily.map(d => ({ date: d._id, count: d.count }))
    });
  } catch (err) {
    console.error('[API] /api/admin/analytics error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload
app.post("/api/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// server
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

// end of file - ensures no hidden characters confuse TypeScript
