"use strict";
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
const db_1 = require("./db");
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const JWT_SECRET = process.env.JWT_SECRET || 'portfolio_secret_key_2025';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ─── Static uploads folder ───────────────────────────────────────────────────
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express_1.default.static(uploadsDir));
// ─── Multer config ────────────────────────────────────────────────────────────
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        jsonwebtoken_1.default.verify(token, JWT_SECRET);
        next();
    }
    catch (_b) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
// ─── Visitor Tracker ─────────────────────────────────────────────────────────
const trackVisitor = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
            req.socket.remoteAddress || '127.0.0.1';
        // Skip local IPs
        if (ip === '127.0.0.1' || ip === '::1')
            return;
        const userAgent = req.headers['user-agent'] || '';
        let country = 'Unknown', countryCode = '', city = '', region = '', isp = '';
        // Geo lookup
        try {
            const geo = yield axios_1.default.get(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,regionName,isp`);
            country = geo.data.country || 'Unknown';
            countryCode = geo.data.countryCode || '';
            city = geo.data.city || '';
            region = geo.data.regionName || '';
            isp = geo.data.isp || '';
        }
        catch ( /* offline - skip geo */_c) { /* offline - skip geo */ }
        // Parse UA
        const browser = userAgent.includes('Chrome') ? 'Chrome'
            : userAgent.includes('Firefox') ? 'Firefox'
                : userAgent.includes('Safari') ? 'Safari'
                    : userAgent.includes('Edge') ? 'Edge' : 'Other';
        const os = userAgent.includes('Windows') ? 'Windows'
            : userAgent.includes('Mac') ? 'macOS'
                : userAgent.includes('Linux') ? 'Linux'
                    : userAgent.includes('Android') ? 'Android'
                        : userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS' : 'Other';
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('ip', db_1.sql.VarChar, ip)
            .input('country', db_1.sql.VarChar, country)
            .input('countryCode', db_1.sql.VarChar, countryCode)
            .input('city', db_1.sql.VarChar, city)
            .input('region', db_1.sql.VarChar, region)
            .input('isp', db_1.sql.VarChar, isp)
            .input('userAgent', db_1.sql.VarChar, userAgent.substring(0, 500))
            .input('browser', db_1.sql.VarChar, browser)
            .input('os', db_1.sql.VarChar, os)
            .query(`INSERT INTO Visitors (ipAddress,country,countryCode,city,region,isp,userAgent,browser,os)
                    VALUES (@ip,@country,@countryCode,@city,@region,@isp,@userAgent,@browser,@os)`);
    }
    catch ( /* silent fail */_d) { /* silent fail */ }
});
// ═══════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
// Main portfolio data
app.get('/api/portfolio', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    trackVisitor(req); // non-blocking
    try {
        const pool = yield db_1.poolPromise;
        const [socialLinks, projects, skills, posts, experiences, settings] = yield Promise.all([
            pool.request().query('SELECT * FROM SocialLinks ORDER BY id'),
            pool.request().query('SELECT * FROM Projects ORDER BY createdAt DESC'),
            pool.request().query('SELECT * FROM Skills ORDER BY id'),
            pool.request().query('SELECT id,title,summary,coverImage,createdAt FROM BlogPosts ORDER BY createdAt DESC'),
            pool.request().query('SELECT * FROM Experiences ORDER BY id DESC'),
            pool.request().query("SELECT * FROM Settings WHERE keyName='cvLink'"),
        ]);
        res.json({
            socialLinks: socialLinks.recordset,
            projects: projects.recordset,
            skills: skills.recordset,
            posts: posts.recordset,
            experiences: experiences.recordset,
            cvLink: ((_a = settings.recordset[0]) === null || _a === void 0 ? void 0 : _a.value) || '/cv.pdf',
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
}));
// Single project
app.get('/api/projects/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const result = yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .query('SELECT * FROM Projects WHERE id=@id');
        if (!result.recordset[0]) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.json(result.recordset[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Single post
app.get('/api/posts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const result = yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .query('SELECT * FROM BlogPosts WHERE id=@id');
        if (!result.recordset[0]) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.json(result.recordset[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ─── Login ────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const pool = yield db_1.poolPromise;
        const result = yield pool.request()
            .input('user', db_1.sql.VarChar, username)
            .input('pass', db_1.sql.VarChar, password)
            .query('SELECT id,username FROM Users WHERE username=@user AND password=@pass');
        if (result.recordset.length > 0) {
            const token = jsonwebtoken_1.default.sign({ id: result.recordset[0].id, username }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token });
        }
        else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ─── File Upload ──────────────────────────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});
// ═══════════════════════════════════════════════════════════════════
// ADMIN — PROJECTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/projects', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const r = yield pool.request().query('SELECT * FROM Projects ORDER BY createdAt DESC');
        res.json(r.recordset);
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.post('/api/admin/projects', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, shortDescription, description, image, images, liveLink, githubLink, tags } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('title', db_1.sql.VarChar, title)
            .input('shortDesc', db_1.sql.VarChar, shortDescription || '')
            .input('desc', db_1.sql.VarChar, description || '')
            .input('img', db_1.sql.VarChar, image || '')
            .input('imgs', db_1.sql.VarChar, images || '')
            .input('live', db_1.sql.VarChar, liveLink || '')
            .input('gh', db_1.sql.VarChar, githubLink || '')
            .input('tags', db_1.sql.VarChar, tags || '')
            .query('INSERT INTO Projects (title,shortDescription,description,image,images,liveLink,githubLink,tags) VALUES (@title,@shortDesc,@desc,@img,@imgs,@live,@gh,@tags)');
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.put('/api/admin/projects/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, shortDescription, description, image, images, liveLink, githubLink, tags } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .input('title', db_1.sql.VarChar, title)
            .input('shortDesc', db_1.sql.VarChar, shortDescription || '')
            .input('desc', db_1.sql.VarChar, description || '')
            .input('img', db_1.sql.VarChar, image || '')
            .input('imgs', db_1.sql.VarChar, images || '')
            .input('live', db_1.sql.VarChar, liveLink || '')
            .input('gh', db_1.sql.VarChar, githubLink || '')
            .input('tags', db_1.sql.VarChar, tags || '')
            .query('UPDATE Projects SET title=@title,shortDescription=@shortDesc,description=@desc,image=@img,images=@imgs,liveLink=@live,githubLink=@gh,tags=@tags WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.delete('/api/admin/projects/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        yield pool.request().input('id', db_1.sql.Int, req.params.id).query('DELETE FROM Projects WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// ADMIN — SKILLS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/skills', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const r = yield pool.request().query('SELECT * FROM Skills ORDER BY id');
        res.json(r.recordset);
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.post('/api/admin/skills', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, logo, category } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('name', db_1.sql.VarChar, name)
            .input('logo', db_1.sql.VarChar, logo || '')
            .input('category', db_1.sql.VarChar, category)
            .query('INSERT INTO Skills (name,logo,category) VALUES (@name,@logo,@category)');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.put('/api/admin/skills/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, logo, category } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .input('name', db_1.sql.VarChar, name)
            .input('logo', db_1.sql.VarChar, logo || '')
            .input('category', db_1.sql.VarChar, category)
            .query('UPDATE Skills SET name=@name,logo=@logo,category=@category WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.delete('/api/admin/skills/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        yield pool.request().input('id', db_1.sql.Int, req.params.id).query('DELETE FROM Skills WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// ADMIN — EXPERIENCES
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/experiences', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const r = yield pool.request().query('SELECT * FROM Experiences ORDER BY id DESC');
        res.json(r.recordset);
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.post('/api/admin/experiences', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, organization, startDate, endDate, description } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('title', db_1.sql.VarChar, title)
            .input('org', db_1.sql.VarChar, organization)
            .input('start', db_1.sql.VarChar, startDate || '')
            .input('end', db_1.sql.VarChar, endDate || 'Present')
            .input('desc', db_1.sql.VarChar, description || '')
            .query('INSERT INTO Experiences (title,organization,startDate,endDate,description) VALUES (@title,@org,@start,@end,@desc)');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.put('/api/admin/experiences/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, organization, startDate, endDate, description } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .input('title', db_1.sql.VarChar, title)
            .input('org', db_1.sql.VarChar, organization)
            .input('start', db_1.sql.VarChar, startDate || '')
            .input('end', db_1.sql.VarChar, endDate || 'Present')
            .input('desc', db_1.sql.VarChar, description || '')
            .query('UPDATE Experiences SET title=@title,organization=@org,startDate=@start,endDate=@end,description=@desc WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.delete('/api/admin/experiences/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        yield pool.request().input('id', db_1.sql.Int, req.params.id).query('DELETE FROM Experiences WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// ADMIN — BLOG POSTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/posts', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const r = yield pool.request().query('SELECT * FROM BlogPosts ORDER BY createdAt DESC');
        res.json(r.recordset);
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.post('/api/admin/posts', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, summary, content, coverImage } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('title', db_1.sql.VarChar, title)
            .input('summary', db_1.sql.VarChar, summary || '')
            .input('content', db_1.sql.VarChar, content || '')
            .input('cover', db_1.sql.VarChar, coverImage || '')
            .query('INSERT INTO BlogPosts (title,summary,content,coverImage) VALUES (@title,@summary,@content,@cover)');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.put('/api/admin/posts/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, summary, content, coverImage } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .input('title', db_1.sql.VarChar, title)
            .input('summary', db_1.sql.VarChar, summary || '')
            .input('content', db_1.sql.VarChar, content || '')
            .input('cover', db_1.sql.VarChar, coverImage || '')
            .query('UPDATE BlogPosts SET title=@title,summary=@summary,content=@content,coverImage=@cover WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.delete('/api/admin/posts/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        yield pool.request().input('id', db_1.sql.Int, req.params.id).query('DELETE FROM BlogPosts WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// ADMIN — SOCIAL LINKS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/social', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const r = yield pool.request().query('SELECT * FROM SocialLinks ORDER BY id');
        res.json(r.recordset);
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.post('/api/admin/social', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { platform, url } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('platform', db_1.sql.VarChar, platform)
            .input('url', db_1.sql.VarChar, url)
            .query('INSERT INTO SocialLinks (platform,url) VALUES (@platform,@url)');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.put('/api/admin/social/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { platform, url } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('id', db_1.sql.Int, req.params.id)
            .input('platform', db_1.sql.VarChar, platform)
            .input('url', db_1.sql.VarChar, url)
            .query('UPDATE SocialLinks SET platform=@platform,url=@url WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.delete('/api/admin/social/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        yield pool.request().input('id', db_1.sql.Int, req.params.id).query('DELETE FROM SocialLinks WHERE id=@id');
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// ADMIN — SETTINGS (CV link)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/settings', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const r = yield pool.request().query('SELECT * FROM Settings');
        res.json(r.recordset);
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
app.put('/api/admin/settings/:key', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { value } = req.body;
        const pool = yield db_1.poolPromise;
        yield pool.request()
            .input('key', db_1.sql.VarChar, req.params.key)
            .input('val', db_1.sql.VarChar, value)
            .query(`IF EXISTS (SELECT * FROM Settings WHERE keyName=@key)
                        UPDATE Settings SET value=@val WHERE keyName=@key
                    ELSE
                        INSERT INTO Settings (keyName,value) VALUES (@key,@val)`);
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// ADMIN — ANALYTICS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/admin/analytics', authMiddleware, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield db_1.poolPromise;
        const [total, today, byCountry, byBrowser, byOs, recent, daily] = yield Promise.all([
            pool.request().query('SELECT COUNT(*) AS total FROM Visitors'),
            pool.request().query("SELECT COUNT(*) AS today FROM Visitors WHERE CAST(visitedAt AS DATE)=CAST(GETDATE() AS DATE)"),
            pool.request().query('SELECT TOP 10 country, COUNT(*) AS count FROM Visitors GROUP BY country ORDER BY count DESC'),
            pool.request().query('SELECT browser, COUNT(*) AS count FROM Visitors GROUP BY browser ORDER BY count DESC'),
            pool.request().query('SELECT os, COUNT(*) AS count FROM Visitors GROUP BY os ORDER BY count DESC'),
            pool.request().query('SELECT TOP 20 * FROM Visitors ORDER BY visitedAt DESC'),
            pool.request().query(`SELECT CAST(visitedAt AS DATE) AS date, COUNT(*) AS count FROM Visitors 
                                  WHERE visitedAt >= DATEADD(DAY, -30, GETDATE())
                                  GROUP BY CAST(visitedAt AS DATE) ORDER BY date`),
        ]);
        res.json({
            total: total.recordset[0].total,
            today: today.recordset[0].today,
            byCountry: byCountry.recordset,
            byBrowser: byBrowser.recordset,
            byOs: byOs.recordset,
            recent: recent.recordset,
            daily: daily.recordset,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// ═══════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT || '5000');
// Add dev script to package.json support
app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio API running at http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
