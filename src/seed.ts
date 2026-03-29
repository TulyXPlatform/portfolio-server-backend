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
      { platform: "github", url: "https://github.com/TulyXPlatform/" },
      { platform: "linkedin", url: "https://linkedin.com/in/tamima-mollick-tuly/" },
      { platform: "bdjobs", url: "https://bdjobs.com/" },
      { platform: "facebook", url: "https://facebook.com/tamimamollicktuly" },
      { platform: "gmail", url: "mailto:tamima.web5202@gmail.com" },
      { platform: "whatsapp", url: "https://wa.me/8801403810202" }
    ]);

    // ================= SETTINGS =================
    await Setting.create({
      keyName: "cvLink",
      value: "/cv.pdf"
    });

    // ================= SKILLS =================
    await Skill.insertMany([
      { name: "React", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg", category: "frontend" },
      { name: "ASP.NET Core", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg", category: "backend" },
      { name: "C#", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg", category: "programming" },
      { name: "Angular", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg", category: "frontend" },
      { name: "MS SQL Server", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg", category: "tech_tools" },
      { name: "JavaScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg", category: "programming" },
      { name: "HTML5", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg", category: "frontend" },
      { name: "CSS3", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg", category: "frontend" },
      { name: "Blazor", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/blazor/blazor-original.svg", category: "frontend" },
      { name: "MAUI", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg", category: "frontend" },
      { name: "Azure", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg", category: "tech_tools" },
      { name: "TypeScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg", category: "programming" }
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
    await Project.insertMany([
      {
        title: "Portfolio Website",
        shortDescription: "Personal portfolio built with React & ASP.NET",
        description: "Full-stack portfolio with seasonal themes, admin panel, and MongoDB backend.",
        image: "https://images.unsplash.com/photo-1507238692062-5a0225d3111b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        liveLink: "#",
        githubLink: "https://github.com/TulyXPlatform/",
        tags: ["React", "TypeScript", "Node.js"]
      },
      {
        title: "E-Commerce Platform",
        shortDescription: "Modern shopping experience with cart and checkout",
        description: "A complete e-commerce solution featuring product catalog, user authentication, shopping cart, and mock payment gateway integration.",
        image: "https://images.unsplash.com/photo-1557821552-17105176677c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        liveLink: "#",
        githubLink: "https://github.com/TulyXPlatform/ecommerce",
        tags: ["ASP.NET Core", "Angular", "MS SQL"]
      },
      {
        title: "Task Management App",
        shortDescription: "Cross-platform task tracker for productivity",
        description: "A kanban-style task management application that syncs across devices, helping teams organize their workflow effectively.",
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        liveLink: "#",
        githubLink: "https://github.com/TulyXPlatform/task-manager",
        tags: ["MAUI", "C#", "Firebase"]
      }
    ]);

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
