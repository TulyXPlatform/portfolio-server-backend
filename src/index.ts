import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { sql, poolPromise } from './db';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'portfolio_secret_key_2025';

app.use(cors());
app.use(express.json());

// ─── Static uploads folder ───────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ─── Multer config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ─── Visitor Tracker ─────────────────────────────────────────────────────────
const trackVisitor = async (req: Request) => {
    try {
        const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket.remoteAddress || '127.0.0.1';

        // Skip local IPs
        if (ip === '127.0.0.1' || ip === '::1') return;

        const userAgent = req.headers['user-agent'] || '';
        let country = 'Unknown', countryCode = '', city = '', region = '', isp = '';

        // Geo lookup
        try {
            const geo = await axios.get(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,regionName,isp`);
            country = geo.data.country || 'Unknown';
            countryCode = geo.data.countryCode || '';
            city = geo.data.city || '';
            region = geo.data.regionName || '';
            isp = geo.data.isp || '';
        } catch { /* offline - skip geo */ }

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

        const pool = await poolPromise;
        await pool.request()
            .input('ip', sql.VarChar, ip)
            .input('country', sql.VarChar, country)
            .input('countryCode', sql.VarChar, countryCode)
            .input('city', sql.VarChar, city)
            .input('region', sql.VarChar, region)
            .input('isp', sql.VarChar, isp)
            .input('userAgent', sql.VarChar, userAgent.substring(0, 500))
            .input('browser', sql.VarChar, browser)
            .input('os', sql.VarChar, os)
            .query(`INSERT INTO Visitors (ipAddress,country,countryCode,city,region,isp,userAgent,browser,os)
                    VALUES (@ip,@country,@countryCode,@city,@region,@isp,@userAgent,@browser,@os)`);
    } catch { /* silent fail */ }
};

// ═══════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Main portfolio data
app.get('/api/portfolio', async (req: Request, res: Response) => {
    trackVisitor(req); // non-blocking
    try {
        const pool = await poolPromise;
        const [socialLinks, projects, skills, posts, experiences, settings] = await Promise.all([
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
            cvLink: settings.recordset[0]?.value || '/cv.pdf',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Single project
app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Projects WHERE id=@id');
        if (!result.recordset[0]) { res.status(404).json({ error: 'Not found' }); return; }
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Single post
app.get('/api/posts/:id', async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM BlogPosts WHERE id=@id');
        if (!result.recordset[0]) { res.status(404).json({ error: 'Not found' }); return; }
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Leave a message
app.post('/api/messages', async (req: Request, res: Response) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !message) { res.status(400).json({ error: 'Name and message are required' }); return; }

        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.VarChar, name)
            .input('email', sql.VarChar, email || null)
            .input('msg', sql.VarChar, message)
            .query('INSERT INTO Messages (name, email, message) VALUES (@name, @email, @msg)');

        // If email is provided, it should be mailed directly to the user
        // (Placeholder for SMTP logic - requires nodemailer and credentials)
        if (email) {
            console.log(`[EMAIL SIMULATION] To: system@portfolio.com, From: ${email}, Subject: New Message from ${name}, Content: ${message}`);
            // In production, use nodemailer here.
        }

        res.json({ success: true, message: 'Message stored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Login ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user', sql.VarChar, username)
            .input('pass', sql.VarChar, password)
            .query('SELECT id,username FROM Users WHERE username=@user AND password=@pass');

        if (result.recordset.length > 0) {
            const token = jwt.sign({ id: result.recordset[0].id, username }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── File Upload ──────────────────────────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    res.json({ url: `/uploads/${req.file.filename}` });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — PROJECTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/projects', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM Projects ORDER BY createdAt DESC');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/projects', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, shortDescription, description, image, images, liveLink, githubLink, tags } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('title', sql.VarChar, title)
            .input('shortDesc', sql.VarChar, shortDescription || '')
            .input('desc', sql.VarChar, description || '')
            .input('img', sql.VarChar, image || '')
            .input('imgs', sql.VarChar, images || '')
            .input('live', sql.VarChar, liveLink || '')
            .input('gh', sql.VarChar, githubLink || '')
            .input('tags', sql.VarChar, tags || '')
            .query('INSERT INTO Projects (title,shortDescription,description,image,images,liveLink,githubLink,tags) VALUES (@title,@shortDesc,@desc,@img,@imgs,@live,@gh,@tags)');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/projects/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, shortDescription, description, image, images, liveLink, githubLink, tags } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('title', sql.VarChar, title)
            .input('shortDesc', sql.VarChar, shortDescription || '')
            .input('desc', sql.VarChar, description || '')
            .input('img', sql.VarChar, image || '')
            .input('imgs', sql.VarChar, images || '')
            .input('live', sql.VarChar, liveLink || '')
            .input('gh', sql.VarChar, githubLink || '')
            .input('tags', sql.VarChar, tags || '')
            .query('UPDATE Projects SET title=@title,shortDescription=@shortDesc,description=@desc,image=@img,images=@imgs,liveLink=@live,githubLink=@gh,tags=@tags WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/projects/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Projects WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — SKILLS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/skills', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM Skills ORDER BY id');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/skills', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { name, logo, category } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.VarChar, name)
            .input('logo', sql.VarChar, logo || '')
            .input('category', sql.VarChar, category)
            .query('INSERT INTO Skills (name,logo,category) VALUES (@name,@logo,@category)');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/skills/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { name, logo, category } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.VarChar, name)
            .input('logo', sql.VarChar, logo || '')
            .input('category', sql.VarChar, category)
            .query('UPDATE Skills SET name=@name,logo=@logo,category=@category WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/skills/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Skills WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — EXPERIENCES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/experiences', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM Experiences ORDER BY id DESC');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/experiences', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, organization, startDate, endDate, description } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('title', sql.VarChar, title)
            .input('org', sql.VarChar, organization)
            .input('start', sql.VarChar, startDate || '')
            .input('end', sql.VarChar, endDate || 'Present')
            .input('desc', sql.VarChar, description || '')
            .query('INSERT INTO Experiences (title,organization,startDate,endDate,description) VALUES (@title,@org,@start,@end,@desc)');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/experiences/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, organization, startDate, endDate, description } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('title', sql.VarChar, title)
            .input('org', sql.VarChar, organization)
            .input('start', sql.VarChar, startDate || '')
            .input('end', sql.VarChar, endDate || 'Present')
            .input('desc', sql.VarChar, description || '')
            .query('UPDATE Experiences SET title=@title,organization=@org,startDate=@start,endDate=@end,description=@desc WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/experiences/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Experiences WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — BLOG POSTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/posts', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM BlogPosts ORDER BY createdAt DESC');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/posts', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, summary, content, coverImage } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('title', sql.VarChar, title)
            .input('summary', sql.VarChar, summary || '')
            .input('content', sql.VarChar, content || '')
            .input('cover', sql.VarChar, coverImage || '')
            .query('INSERT INTO BlogPosts (title,summary,content,coverImage) VALUES (@title,@summary,@content,@cover)');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/posts/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { title, summary, content, coverImage } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('title', sql.VarChar, title)
            .input('summary', sql.VarChar, summary || '')
            .input('content', sql.VarChar, content || '')
            .input('cover', sql.VarChar, coverImage || '')
            .query('UPDATE BlogPosts SET title=@title,summary=@summary,content=@content,coverImage=@cover WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/posts/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM BlogPosts WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — SOCIAL LINKS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/social', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM SocialLinks ORDER BY id');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/social', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { platform, url } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('platform', sql.VarChar, platform)
            .input('url', sql.VarChar, url)
            .query('INSERT INTO SocialLinks (platform,url) VALUES (@platform,@url)');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/social/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { platform, url } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('platform', sql.VarChar, platform)
            .input('url', sql.VarChar, url)
            .query('UPDATE SocialLinks SET platform=@platform,url=@url WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/social/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM SocialLinks WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — MESSAGES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/messages', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM Messages ORDER BY createdAt DESC');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/messages/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Messages WHERE id=@id');
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — SETTINGS (CV link)
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/settings', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query('SELECT * FROM Settings');
        res.json(r.recordset);
    } catch { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/settings/:key', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { value } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('key', sql.VarChar, req.params.key)
            .input('val', sql.VarChar, value)
            .query(`IF EXISTS (SELECT * FROM Settings WHERE keyName=@key)
                        UPDATE Settings SET value=@val WHERE keyName=@key
                    ELSE
                        INSERT INTO Settings (keyName,value) VALUES (@key,@val)`);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN — ANALYTICS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/admin/analytics', authMiddleware, async (_req, res) => {
    try {
        const pool = await poolPromise;
        const [total, today, byCountry, byBrowser, byOs, recent, daily] = await Promise.all([
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
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT || '5000');

// Add dev script to package.json support
app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio API running at http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
});
