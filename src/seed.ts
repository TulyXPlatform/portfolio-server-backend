import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/User";
import SocialLink from "./models/SocialLink";
import Setting from "./models/Setting";
import Skill from "./models/Skill";
import Experience from "./models/Experience";
import Project from "./models/Project";
import BlogPost from "./models/BlogPost";
import Visitor from "./models/Visitor";
import Message from "./models/Message";

dotenv.config();

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

export async function seedData() {
  try {
    // Clear old data (optional)
    await User.deleteMany({});
    await SocialLink.deleteMany({});
    await Setting.deleteMany({});
    await Skill.deleteMany({});
    await Experience.deleteMany({});
    await Project.deleteMany({});
    await BlogPost.deleteMany({});
    await Visitor.deleteMany({});
    await Message.deleteMany({});

    // ================= USERS =================
    await User.create({
      username: "admin",
      password: "admin123"
    });

    // ================= SOCIAL LINKS =================
    await SocialLink.insertMany([
      { platform: "github", url: "https://github.com/" },
      { platform: "linkedin", url: "https://linkedin.com/in/" },
      { platform: "bdjobs", url: "https://bdjobs.com/" },
      { platform: "facebook", url: "https://facebook.com/" },
      { platform: "gmail", url: "mailto:your@gmail.com" },
      { platform: "whatsapp", url: "https://wa.me/880" }
    ]);

    // ================= SETTINGS =================
    await Setting.create({
      keyName: "cvLink",
      value: "/cv.pdf"
    });

    // ================= SKILLS =================
    await Skill.insertMany([
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
    await Experience.create({
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
    await Project.create({
      title: "Portfolio Website",
      shortDescription: "My personal portfolio built with React & ASP.NET",
      description: "Full-stack portfolio with seasonal themes, admin panel, and MS SQL backend.",
      image: "",
      liveLink: "#",
      githubLink: "https://github.com/",
      tags: ["React", "TypeScript", "Node.js"]
    });

    // ================= BLOG POSTS =================
    await BlogPost.insertMany([
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

  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

// allow the file to be executed directly or imported
if (require.main === module) {
  seedData().then(() => process.exit(0)).catch(() => process.exit(1));
}
