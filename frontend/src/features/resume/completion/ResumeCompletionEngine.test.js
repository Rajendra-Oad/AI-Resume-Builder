import { describe, expect, it } from "vitest";

import { ResumeCompletionEngine } from "./ResumeCompletionEngine";

const engine = new ResumeCompletionEngine();

describe("ResumeCompletionEngine", () => {
  it("does not increase completion when a builder step is visited", () => {
    const first = engine.calculate({ currentStep: 0 }, [], {});
    const visited = engine.calculate({ currentStep: 4, visitedSteps: [0, 1, 2, 3, 4] }, [], {});
    expect(visited.overall).toBe(first.overall);
    expect(visited.overall).toBe(0);
  });

  it("scores valid content by configured section weights", () => {
    const resume = {
      summary: Array.from({ length: 65 }, (_, index) => `specific${index}`).join(" "),
      contactEmail: "person@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru, India",
      linkedinUrl: "linkedin.com/in/person",
      githubUrl: "github.com/person",
      languagesContent: "English: Fluent",
    };
    const sections = [
      { type: "EDUCATION", institution: "University", degree: "B.Tech", startYear: 2020 },
      { type: "EXPERIENCE", employer: "Acme", role: "Engineer", startDate: "2024", endDate: "Present", description: "Built and delivered a platform that improved processing time by 30 percent for customers." },
      { type: "PROJECT", name: "Builder", description: "Developed a resume platform using React, Java, Spring, and SQL for job seekers." },
      ...["React", "JavaScript", "SQL"].map((name) => ({ type: "SKILL", name })),
      { type: "CERTIFICATION", name: "Cloud", issuedBy: "Provider" },
    ];
    const result = engine.calculate(resume, sections, { firstName: "Example", lastName: "Person" });
    expect(result.overall).toBeGreaterThan(80);
    expect(result.sections.find((section) => section.id === "personal").status).toBe("complete");
    expect(result.sections.find((section) => section.id === "experience").completion).toBe(100);
  });

  it("returns specific improvement suggestions for weak content", () => {
    const result = engine.calculate({ summary: "Student", skillsContent: "React" }, [], {});
    expect(result.remainingItems.map((item) => item.text)).toContain("Your professional summary is too short (1/60 words).");
    expect(result.remainingItems.map((item) => item.text)).toContain("Include at least three relevant skills (1/3).");
  });
});
