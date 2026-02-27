-- ===================================================
-- Portfolio Database Schema (Full)
-- Run this in MS SQL Server Management Studio
-- ===================================================

-- Create database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PortfolioDB')
BEGIN
    CREATE DATABASE PortfolioDB;
END
GO

USE PortfolioDB;
GO

-- ===================================================
-- USERS TABLE (Admin Login)
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);
GO

-- ===================================================
-- SOCIAL LINKS TABLE
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SocialLinks')
CREATE TABLE SocialLinks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,  -- github, linkedin, bdjobs, facebook, gmail, whatsapp
    url VARCHAR(MAX) NOT NULL,
    icon VARCHAR(100)               -- optional icon override
);
GO

-- ===================================================
-- CV LINK TABLE (single row settings)
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Settings')
CREATE TABLE Settings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    keyName VARCHAR(100) NOT NULL UNIQUE,
    value VARCHAR(MAX)
);
GO

-- ===================================================
-- PROJECTS TABLE
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
CREATE TABLE Projects (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    shortDescription VARCHAR(500),
    description VARCHAR(MAX),
    image VARCHAR(MAX),             -- primary image URL
    images VARCHAR(MAX),            -- comma-separated extra image URLs
    liveLink VARCHAR(MAX),
    githubLink VARCHAR(MAX),
    tags VARCHAR(MAX),              -- comma-separated tags
    createdAt DATETIME DEFAULT GETDATE()
);
GO

-- ===================================================
-- SKILLS TABLE
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Skills')
CREATE TABLE Skills (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo VARCHAR(MAX),              -- logo URL
    category VARCHAR(50) NOT NULL   -- 'good_at' or 'know'
);
GO

-- ===================================================
-- BLOG POSTS TABLE
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BlogPosts')
CREATE TABLE BlogPosts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title VARCHAR(MAX) NOT NULL,
    summary VARCHAR(MAX),
    content VARCHAR(MAX),
    coverImage VARCHAR(MAX),
    createdAt DATETIME DEFAULT GETDATE()
);
GO

-- ===================================================
-- EXPERIENCES TABLE
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Experiences')
CREATE TABLE Experiences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    organization VARCHAR(200) NOT NULL,
    startDate VARCHAR(50),
    endDate VARCHAR(50),            -- 'Present' or date string
    description VARCHAR(MAX)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Visitors')
CREATE TABLE Visitors (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ipAddress VARCHAR(50),
    country VARCHAR(100),
    countryCode VARCHAR(10),
    city VARCHAR(100),
    region VARCHAR(100),
    isp VARCHAR(200),
    userAgent VARCHAR(500),
    browser VARCHAR(50),
    os VARCHAR(50),
    visitedAt DATETIME DEFAULT GETDATE()
);
GO

-- ===================================================
-- MESSAGES TABLE
-- ===================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
CREATE TABLE Messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    message VARCHAR(MAX) NOT NULL,
    createdAt DATETIME DEFAULT GETDATE()
);
GO

-- ===================================================
-- SEED DATA
-- ===================================================

-- Default admin
IF NOT EXISTS (SELECT * FROM Users WHERE username = 'admin')
    INSERT INTO Users (username, password) VALUES ('admin', 'admin123');

-- Default social links
IF NOT EXISTS (SELECT * FROM SocialLinks)
BEGIN
    INSERT INTO SocialLinks (platform, url) VALUES 
    ('github', 'https://github.com/'),
    ('linkedin', 'https://linkedin.com/in/'),
    ('bdjobs', 'https://bdjobs.com/'),
    ('facebook', 'https://facebook.com/'),
    ('gmail', 'mailto:your@gmail.com'),
    ('whatsapp', 'https://wa.me/880');
END

-- Default CV setting
IF NOT EXISTS (SELECT * FROM Settings WHERE keyName = 'cvLink')
    INSERT INTO Settings (keyName, value) VALUES ('cvLink', '/cv.pdf');

-- Default skills
IF NOT EXISTS (SELECT * FROM Skills)
    INSERT INTO Skills (name, logo, category) VALUES 
    ('React', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg', 'good_at'),
    ('ASP.NET Core', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg', 'good_at'),
    ('C#', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg', 'good_at'),
    ('Angular', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg', 'good_at'),
    ('MS SQL Server', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg', 'good_at'),
    ('JavaScript', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg', 'good_at'),
    ('HTML5', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg', 'good_at'),
    ('CSS3', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg', 'good_at'),
    ('Blazor', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/blazor/blazor-original.svg', 'know'),
    ('MAUI', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg', 'know'),
    ('Azure', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg', 'know'),
    ('TypeScript', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg', 'know');

-- Default experience
IF NOT EXISTS (SELECT * FROM Experiences)
    INSERT INTO Experiences (title, organization, startDate, endDate, description) VALUES
    ('Trainee - Cross Platform Apps', 'IsDB-BISEW IT Scholarship Programme', 'Jan 2025', 'Present',
    '1. Design and implement databases with MS SQL Server 2019 and 2022 EE
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
13. Developing Cross Platform Mobile Applications using MAUI');

-- Default project
IF NOT EXISTS (SELECT * FROM Projects)
    INSERT INTO Projects (title, shortDescription, description, image, liveLink, githubLink, tags) VALUES
    ('Portfolio Website', 'My personal portfolio built with React & ASP.NET', 'Full-stack portfolio with seasonal themes, admin panel, and MS SQL backend.', '', '#', 'https://github.com/', 'React,TypeScript,Node.js');

-- Default blog posts
IF NOT EXISTS (SELECT * FROM BlogPosts)
    INSERT INTO BlogPosts (title, summary, content) VALUES
    ('Getting Started with ASP.NET Core', 'A beginner guide to ASP.NET Core Web APIs', 'Full article content here...'),
    ('React Hooks Explained', 'Everything you need to know about React hooks', 'Full article content here...');
GO
