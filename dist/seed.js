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
exports.seedData = seedData;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("./models/User"));
const SocialLink_1 = __importDefault(require("./models/SocialLink"));
const Setting_1 = __importDefault(require("./models/Setting"));
const Skill_1 = __importDefault(require("./models/Skill"));
const Experience_1 = __importDefault(require("./models/Experience"));
const Project_1 = __importDefault(require("./models/Project"));
const BlogPost_1 = __importDefault(require("./models/BlogPost"));
const Visitor_1 = __importDefault(require("./models/Visitor"));
const Message_1 = __importDefault(require("./models/Message"));
dotenv_1.default.config();
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error(err));
function seedData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Clear old data (optional)
            yield User_1.default.deleteMany({});
            yield SocialLink_1.default.deleteMany({});
            yield Setting_1.default.deleteMany({});
            yield Skill_1.default.deleteMany({});
            yield Experience_1.default.deleteMany({});
            yield Project_1.default.deleteMany({});
            yield BlogPost_1.default.deleteMany({});
            yield Visitor_1.default.deleteMany({});
            yield Message_1.default.deleteMany({});
            // ================= USERS =================
            yield User_1.default.create({
                username: "admin",
                password: "admin123"
            });
            // ================= SOCIAL LINKS =================
            yield SocialLink_1.default.insertMany([
                { platform: "github", url: "https://github.com/" },
                { platform: "linkedin", url: "https://linkedin.com/in/" },
                { platform: "bdjobs", url: "https://bdjobs.com/" },
                { platform: "facebook", url: "https://facebook.com/" },
                { platform: "gmail", url: "mailto:your@gmail.com" },
                { platform: "whatsapp", url: "https://wa.me/880" }
            ]);
            // ================= SETTINGS =================
            yield Setting_1.default.create({
                keyName: "cvLink",
                value: "/cv.pdf"
            });
            // ================= SKILLS =================
            yield Skill_1.default.insertMany([
                { name: "React", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg", category: "good_at" },
                { name: "ASP.NET Core", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg", category: "good_at" },
                { name: "C#", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg", category: "good_at" },
                { name: "Angular", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg", category: "good_at" },
                { name: "MS SQL Server", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg", category: "good_at" },
                { name: "JavaScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg", category: "good_at" },
                { name: "HTML5", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg", category: "good_at" },
                { name: "CSS3", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg", category: "good_at" },
                { name: "Blazor", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/blazor/blazor-original.svg", category: "know" },
                { name: "MAUI", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg", category: "know" },
                { name: "Azure", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg", category: "know" },
                { name: "TypeScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg", category: "know" }
            ]);
            // ================= EXPERIENCE =================
            yield Experience_1.default.create({
                title: "Trainee - Cross Platform Apps",
                organization: "IsDB-BISEW IT Scholarship Programme",
                startDate: "Jan 2025",
                endDate: "Present",
                description: `1. Design and implement databases with MS SQL Server 2019 and 2022 EE
2. Programming with C# 7 and .Net 5
3. Programming in HTML5 with JavaScript & CSS3
4. Introduction to XML, ADO.NET & Reporting
5. Developing ASP.NET MVC 5 Web Applications
6. Entity Framework 6 Code First using ASP.NET MVC 5
7. Developing ASP.NET Core Web Applications
8. Entity Framework Core Code First using ASP.NET Core
9. Developing Web APIs, Windows Azure and Web Services using ASP.NET MVC 5
10. Developing Web APIs, Windows Azure and Web Services using ASP.NET Core
11. Advanced Web Application Development with Angular
12. Advanced Web Application Development with Blazor Server & Web Assembly
13. Developing Cross Platform Mobile Applications using MAUI`
            });
            // ================= PROJECT =================
            yield Project_1.default.create({
                title: "Portfolio Website",
                shortDescription: "My personal portfolio built with React & ASP.NET",
                description: "Full-stack portfolio with seasonal themes, admin panel, and MS SQL backend.",
                image: "",
                liveLink: "#",
                githubLink: "https://github.com/",
                tags: ["React", "TypeScript", "Node.js"]
            });
            // ================= BLOG POSTS =================
            yield BlogPost_1.default.insertMany([
                {
                    title: "Getting Started with ASP.NET Core",
                    summary: "A beginner guide to ASP.NET Core Web APIs",
                    content: "Full article content here..."
                },
                {
                    title: "React Hooks Explained",
                    summary: "Everything you need to know about React hooks",
                    content: "Full article content here..."
                }
            ]);
            console.log("✅ MongoDB Seed Data Inserted Successfully");
            process.exit();
        }
        catch (error) {
            console.error("❌ Seed error:", error);
            process.exit(1);
        }
    });
}
// allow the file to be executed directly or imported
if (require.main === module) {
    seedData();
}
