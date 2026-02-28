import express, { Request, Response, NextFunction } from "express";
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
connectDB();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET!;

app.use(cors());
app.use(express.json());

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
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress;

    if (!ip) return;
    //the const geo line sometimes fails  on render. then we have to use this line instead of that
    /*if (ip === "127.0.0.1" || ip === "::1") return;*/

    const geo = await axios.get(`http://ip-api.com/json/${ip}`);

    const ua = req.headers["user-agent"] || "";

    const browser = ua.includes("Chrome") ? "Chrome"
      : ua.includes("Firefox") ? "Firefox"
      : ua.includes("Safari") ? "Safari"
      : "Other";

    const os = ua.includes("Windows") ? "Windows"
      : ua.includes("Mac") ? "macOS"
      : ua.includes("Linux") ? "Linux"
      : "Other";

    await Visitor.create({
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
  } catch {}
  
};

/* ================= PUBLIC ================= */

app.get("/api/portfolio", async (req, res) => {
  trackVisitor(req);

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
    socialLinks,
    projects,
    skills,
    posts,
    experiences,
    cvLink: settings?.value || "/cv.pdf"
  });
});

app.get("/api/projects/:id", async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

app.get("/api/posts/:id", async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  res.json(post);
});

app.post("/api/messages", async (req, res) => {
  await Message.create(req.body);
  res.json({ success: true });
});

/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ success: true, token });
});

/* ================= ADMIN CRUD ================= */

app.get("/api/admin/projects", authMiddleware, async (_req, res) => {
  res.json(await Project.find().sort({ createdAt: -1 }));
});

app.post("/api/admin/projects", authMiddleware, async (req, res) => {
  await Project.create(req.body);
  res.json({ success: true });
});

app.put("/api/admin/projects/:id", authMiddleware, async (req, res) => {
  await Project.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/admin/projects/:id", authMiddleware, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Skills
app.get("/api/admin/skills", authMiddleware, async (_req, res) => {
  res.json(await Skill.find());
});

app.post("/api/admin/skills", authMiddleware, async (req, res) => {
  await Skill.create(req.body);
  res.json({ success: true });
});

app.put("/api/admin/skills/:id", authMiddleware, async (req, res) => {
  await Skill.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/admin/skills/:id", authMiddleware, async (req, res) => {
  await Skill.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Experiences
app.get("/api/admin/experiences", authMiddleware, async (_req, res) => {
  res.json(await Experience.find());
});

app.post("/api/admin/experiences", authMiddleware, async (req, res) => {
  await Experience.create(req.body);
  res.json({ success: true });
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
  res.json(await BlogPost.find());
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
  res.json(await SocialLink.find());
});

app.post("/api/admin/social", authMiddleware, async (req, res) => {
  await SocialLink.create(req.body);
  res.json({ success: true });
});

app.put("/api/admin/social/:id", authMiddleware, async (req, res) => {
  await SocialLink.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete("/api/admin/social/:id", authMiddleware, async (req, res) => {
  await SocialLink.findByIdAndDelete(req.params.id);
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
  const total = await Visitor.countDocuments();
  const today = await Visitor.countDocuments({
    visitedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
  });

  const byCountry = await Visitor.aggregate([
    { $group: { _id: "$country", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.json({ total, today, byCountry });
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