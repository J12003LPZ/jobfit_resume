import type { Profile } from "@/types/profile";

export const leonardoProfile: Profile = {
  name: "Leonardo Lopez",
  title: "Web Developer",
  contact: {
    email: "leonardojeziellopez@gmail.com",
    phone: "(347) 659-1803",
    location: "New York, NY",
    linkedin: "linkedin.com/in/leonardo-jeziel-lopez",
    portfolio: "https://portfolio-leonardo-lopez.vercel.app/",
  },
  summary:
    "Dynamic Web Developer skilled in Python and JavaScript with extensive background in records and information services. Proven track record in creating secure, user-friendly applications and optimizing performance. Adept at complex problem solving and delivering innovative solutions that enhance user experience and meet client needs. Communicate and collaborate effectively on multidisciplinary teams.",
  skills: [
    "Python", "JavaScript", "TypeScript", "Java", "SQL", "HTML", "CSS", "Git",
    "GitHub", "React", "Node.js", "Flask", "REST APIs", "Responsive Design",
    "Web Development", "Database Management", "AI/LLM Integration",
    "Generative AI", "Prompt Engineering", "RAG", "Computer Vision",
    "Automation", "Full-Stack Development", "Software Development",
    "API Integration", "System Design", "Debugging", "Testing",
    "Performance Optimization", "Cloud Technologies", "Agile Methodologies",
    "Version Control", "Data Structures & Algorithms", "Information Retrieval",
    "Workflow Automation", "Problem Solving", "NoSQL", "PostgreSQL",
    "Project Management",
  ],
  experience: [
    {
      company: "NYC Department of Records and Information Services",
      location: "New York, NY",
      role: "Web Developer",
      dates: "Nov 2022 – May 2026",
      bullets: [
        "Migrated the New York Archival Society website from Squarespace to a custom full-stack web application using Python, JavaScript, and SQL, reducing annual platform costs from approximately $2,500 to $5.",
        "Designed and developed scalable backend features, including PayPal payment integration, improving maintainability, transaction handling, and future feature expansion.",
        "Built and integrated RESTful APIs to support dynamic application functionality, streamline data flow, and connect frontend, backend, and database layers.",
        "Developed a volunteer management platform using Python, Flask, SQLAlchemy, and PostgreSQL to manage recruitment, scheduling, tracking, and administrative workflows.",
        "Designed and maintained database systems, including schema design, SQL query optimization, data validation, backups, and performance tuning to improve accuracy and efficiency.",
        "Improved application reliability through debugging, testing, Git version control, Agile collaboration, and code reviews.",
      ],
    },
  ],
  projects: [],
  education: [
    {
      school: "New York City College of Technology, CUNY",
      location: "Brooklyn, NY",
      degree: "Bachelor of Technology, Computer Systems Technology",
      dates: "May 2026",
      gpa: "3.254",
      honors: ["Dean's List | 01/06/2026", "Dean's List | 06/15/2024"],
    },
    {
      school: "New York City College of Technology, CUNY",
      location: "Brooklyn, NY",
      degree: "Associate in Applied Science, Computer Information Systems",
      dates: "Feb 2025",
      gpa: "3.012",
      honors: ["Dean's List | 01/13/2023"],
    },
  ],
};

/** Flat list of every keyword the profile can satisfy (for gap matching). */
export function profileKeywords(): string[] {
  const fromSkills = leonardoProfile.skills;
  const fromProjects = leonardoProfile.projects.flatMap((p) => p.technologies);
  return [...fromSkills, ...fromProjects];
}
