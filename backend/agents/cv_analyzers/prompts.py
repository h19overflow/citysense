"""Prompt templates for CV analysis agents."""

CV_PAGE_ANALYSIS_PROMPT = """\
You are a precise CV parsing engine. Extract structured data from the CV page below.
Return only what is explicitly written. Never infer, hallucinate, or fill gaps.

══════════════════════════════════════════════════
FIELD DEFINITIONS — read carefully before extracting
══════════════════════════════════════════════════

### experience
Formal employment ONLY: full-time jobs, part-time jobs, internships, co-ops, apprenticeships.
A valid entry MUST have all three: (1) an official job title, (2) a named employer organisation, (3) a date range or "Present".

VALID examples:
  ✓ "AI Engineer Intern" at "Telekom Malaysia R&D", Aug 2024 – Jan 2025
  ✓ "Backend Developer" at "Acme Corp", Jun 2023 – Dec 2023

INVALID — do NOT add to experience:
  ✗ Personal projects (even if described in detail)
  ✗ Academic or university projects
  ✗ Hackathon or competition entries
  ✗ Open-source contributions
  ✗ Freelance work with no named client
  ✗ Anything listed under a "Projects" or "Portfolio" heading

If a section heading says "Projects", everything under it goes into `projects`, NOT `experience`.

### projects
Personal, academic, open-source, or freelance projects.
These appear under headings like: Projects, Portfolio, Side Projects, Academic Projects, Hackathons.
Each entry needs a name and a short description of what it does and the candidate's contribution.

VALID examples:
  ✓ "Production RAG Platform" — deployed RAG on AWS, built async document processing
  ✓ "Kill-Chain Exploitation Pipeline" — 3-phase security pipeline reducing attack surface

### skills
Abstract technical competencies and knowledge domains.
Include: programming languages, ML/AI methods, engineering disciplines, domain expertise.
Examples: Python, Machine Learning, NLP, Computer Vision, Data Engineering, SQL.
Do NOT include product names or tools (those go in `tools`).

### soft_skills
Interpersonal and transferable attributes.
Only include if explicitly stated or directly evidenced (e.g. "led a team of 5" → Leadership).
Examples: Leadership, Communication, Problem-solving, Teamwork, Attention to Detail.

### tools
Specific named products, platforms, libraries, frameworks, and services.
Examples: Docker, AWS, LangChain, PostgreSQL, PyTorch, FastAPI, Redis, Kubernetes.
Rule of thumb: if it has a brand name or a logo, it's a tool.

### roles
Job titles the person has formally held OR is explicitly targeting.
Source from: job titles in experience entries, "Seeking X role" statements, LinkedIn headline.
Examples: "AI Engineer", "Data Scientist", "Machine Learning Engineer".
Do NOT include: project names, section headings, company names, technology names.

### education
Formal academic qualifications and certifications.
Each entry: institution name, degree/diploma/cert title, year or period.
Only extract what is written. Do not infer.

### summary
Write exactly 2–3 sentences in third-person formal English.
Cover: (1) professional identity + years of experience, (2) top 2-3 domains, (3) career goal or trajectory.
Base it ONLY on content visible on this page.
If the page has no meaningful profile information, return an empty string.

Example of a good summary:
"A Computer Science graduate with 1.5 years of applied AI experience spanning RAG systems,
multi-agent orchestration, and computer vision. Proficient in Python, LangChain, and AWS,
with a proven track record of deploying production-grade ML pipelines. Targeting ML Engineer
or AI Engineer roles in industry."

══════════════════════════════════════════════════
CV PAGE CONTENT
══════════════════════════════════════════════════
{page_content}
"""
