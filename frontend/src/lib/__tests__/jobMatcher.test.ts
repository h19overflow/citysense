import { describe, it, expect } from "vitest";
import { matchJobsToProfile, computeTrendingSkills, jobMatchesSkillFilter } from "../jobMatcher";
import type { CvData, JobListing } from "../types";

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeJob(overrides: Partial<JobListing> = {}): JobListing {
  return {
    id: "job-1",
    title: "Software Engineer",
    company: "Acme Corp",
    source: "indeed",
    address: "123 Main St, Montgomery, AL",
    lat: 32.37,
    lng: -86.3,
    geocodeSource: "manual",
    jobType: "Full-time",
    salary: "$60,000",
    seniority: "Mid-Senior level",
    industry: "Technology",
    posted: "2026-01-01",
    url: "https://example.com",
    applyLink: "https://example.com/apply",
    skills: { technical: ["python", "sql"] },
    skillSummary: "python sql javascript",
    benefits: [],
    scrapedAt: "2026-01-01",
    ...overrides,
  };
}

function makeCv(skills: string[]): CvData {
  return {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "334-555-0000",
    location: "Montgomery, AL",
    experience: [],
    education: [],
    skills,
    summary: "",
  };
}

// ------------------------------------------------------------------
// matchJobsToProfile
// ------------------------------------------------------------------

describe("matchJobsToProfile", () => {
  it("returns 100% match when user has all required skills", () => {
    const jobs = [makeJob({ skills: { technical: ["python", "sql"] } })];
    const cv = makeCv(["Python", "SQL"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].matchPercent).toBe(100);
    expect(matches[0].matchedSkills).toHaveLength(2);
    expect(matches[0].missingSkills).toHaveLength(0);
  });

  it("returns 0% match when user has none of the required skills", () => {
    const jobs = [makeJob({ skills: { technical: ["python", "sql"] } })];
    const cv = makeCv(["welding"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].matchPercent).toBe(0);
    expect(matches[0].missingSkills).toHaveLength(2);
  });

  it("returns partial match when user has some required skills", () => {
    const jobs = [makeJob({ skills: { technical: ["python", "sql", "javascript"] } })];
    const cv = makeCv(["Python"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].matchPercent).toBe(33);
    expect(matches[0].matchedSkills).toHaveLength(1);
    expect(matches[0].missingSkills).toHaveLength(2);
  });

  it("sorts results by matchPercent descending", () => {
    const jobs = [
      makeJob({ id: "job-low", skills: { technical: ["python", "java", "go"] } }),
      makeJob({ id: "job-high", skills: { technical: ["python"] } }),
    ];
    const cv = makeCv(["Python"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].id).toBe("job-high");
    expect(matches[1].id).toBe("job-low");
  });

  it("returns 0% and empty matched skills for job with no skills", () => {
    const jobs = [makeJob({ skills: {} })];
    const cv = makeCv(["Python", "SQL"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].matchPercent).toBe(0);
    expect(matches[0].matchedSkills).toHaveLength(0);
  });

  it("expands cv skills using known mappings (microsoft office → excel + computer)", () => {
    const jobs = [makeJob({ skills: { technical: ["excel"] } })];
    const cv = makeCv(["Microsoft Office"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].matchPercent).toBe(100);
  });

  it("ignores requirement categories (clearance, physical, experience) when computing match", () => {
    const jobs = [
      makeJob({
        skills: {
          technical: ["python"],
          clearance: ["top secret"],
          physical: ["lifting"],
        },
      }),
    ];
    const cv = makeCv(["Python"]);

    const matches = matchJobsToProfile(jobs, cv);

    expect(matches[0].matchPercent).toBe(100);
    expect(matches[0].missingSkills).toHaveLength(0);
  });
});

// ------------------------------------------------------------------
// computeTrendingSkills
// ------------------------------------------------------------------

describe("computeTrendingSkills", () => {
  it("counts skills across multiple jobs and returns sorted by count", () => {
    const jobs = [
      makeJob({ id: "j1", skills: { technical: ["python", "sql"] } }),
      makeJob({ id: "j2", skills: { technical: ["python"] } }),
      makeJob({ id: "j3", skills: { technical: ["sql"] } }),
    ];

    const trending = computeTrendingSkills(jobs);
    const names = trending.map((t) => t.name);

    expect(names.indexOf("Python")).toBeLessThan(names.indexOf("SQL"));
  });

  it("returns percent relative to total job count", () => {
    const jobs = [
      makeJob({ id: "j1", skills: { technical: ["python"] } }),
      makeJob({ id: "j2", skills: { technical: ["python"] } }),
      makeJob({ id: "j3", skills: {} }),
    ];

    const trending = computeTrendingSkills(jobs);
    const pythonEntry = trending.find((t) => t.name === "Python");

    expect(pythonEntry).toBeDefined();
    expect(pythonEntry!.percent).toBe(67);
  });

  it("returns empty array for jobs with no skills", () => {
    const jobs = [makeJob({ skills: {} }), makeJob({ skills: {} })];

    const trending = computeTrendingSkills(jobs);

    expect(trending).toHaveLength(0);
  });

  it("excludes healthcare-only skills for non-healthcare jobs", () => {
    const jobs = [
      makeJob({
        title: "Warehouse Associate",
        skills: { healthcare: ["rn", "cna"] },
        skillSummary: "warehouse forklift",
      }),
    ];

    const trending = computeTrendingSkills(jobs);
    const skillNames = trending.map((t) => t.rawKey);

    expect(skillNames).not.toContain("rn");
    expect(skillNames).not.toContain("cna");
  });

  it("includes healthcare skills for healthcare-titled jobs", () => {
    const jobs = [
      makeJob({
        title: "Registered Nurse (RN)",
        skills: { healthcare: ["rn", "patient care"] },
        skillSummary: "rn patient care",
      }),
    ];

    const trending = computeTrendingSkills(jobs);
    const skillNames = trending.map((t) => t.rawKey);

    expect(skillNames).toContain("rn");
  });
});

// ------------------------------------------------------------------
// jobMatchesSkillFilter
// ------------------------------------------------------------------

describe("jobMatchesSkillFilter", () => {
  it("returns true when skill appears in skillSummary for a non-healthcare skill", () => {
    const job = makeJob({ skillSummary: "python sql javascript" });
    expect(jobMatchesSkillFilter(job, "python")).toBe(true);
  });

  it("returns false when skill does not appear in skillSummary", () => {
    const job = makeJob({ skillSummary: "python sql" });
    expect(jobMatchesSkillFilter(job, "welding")).toBe(false);
  });

  it("returns false for healthcare-only skill on non-healthcare job title", () => {
    const job = makeJob({ title: "Warehouse Worker", skillSummary: "rn nursing" });
    expect(jobMatchesSkillFilter(job, "rn")).toBe(false);
  });

  it("returns true for healthcare-only skill on healthcare job title", () => {
    const job = makeJob({ title: "Registered Nurse", skillSummary: "rn patient care" });
    expect(jobMatchesSkillFilter(job, "rn")).toBe(true);
  });
});
