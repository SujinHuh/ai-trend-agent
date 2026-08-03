import { describe, expect, it } from "vitest";

import type { DigestCandidate } from "../src/domain/types.js";
import { isUrgentCandidate, renderSlackDigest } from "../src/slack/render-slack-digest.js";

describe("renderSlackDigest", () => {
  it("renders a deterministic Slack payload with source links and LLM Wiki IDs", () => {
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: [candidate()],
      limit: 5
    });

    expect(payload.text).toBe("AI Trend Daily Digest - 2026-08-01");
    expect(JSON.stringify(payload)).toContain("AI Trend Daily Digest - 2026-08-01");
    expect(JSON.stringify(payload)).toContain("assessment_one");
    expect(JSON.stringify(payload)).toContain("https://example.com/source");
    expect(JSON.stringify(payload)).toContain("Urgent");
  });

  it("uses conservative urgent criteria", () => {
    expect(isUrgentCandidate(candidate())).toBe(true);
    expect(
      isUrgentCandidate({
        ...candidate(),
        assessment: {
          ...candidate().assessment,
          confidence: 0.84
        }
      })
    ).toBe(false);
  });

  it("escapes urgent titles", () => {
    const unsafe = {
      ...candidate(),
      trendItem: {
        ...candidate().trendItem,
        title: "Unsafe <!here> & <tag>"
      }
    };
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: [unsafe],
      limit: 5
    });
    const rendered = JSON.stringify(payload);

    expect(rendered).toContain("Unsafe &lt;!here&gt; &amp; &lt;tag&gt;");
    expect(rendered).not.toContain("Unsafe <!here>");
  });

  it("escapes Slack link URL delimiters", () => {
    const unsafe = {
      ...candidate(),
      trendItem: {
        ...candidate().trendItem,
        canonicalUrl: "https://example.com/model path|unsafe<label>tail"
      },
      lineage: [
        {
          assessmentId: "assessment_one",
          sourceEvidenceId: "evidence_one",
          sourceName: "Example Source",
          sourceUrl: "https://example.com/source path|unsafe<label>tail",
          confidenceScore: 0.85
        }
      ]
    };
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: [unsafe],
      limit: 5
    });
    const rendered = JSON.stringify(payload);

    expect(rendered).toContain("https://example.com/model%20path%7Cunsafe%3Clabel%3Etail");
    expect(rendered).toContain("https://example.com/source%20path%7Cunsafe%3Clabel%3Etail");
    expect(rendered).not.toContain("<https://example.com/model path|unsafe<label>tail|");
    expect(rendered).not.toContain("<https://example.com/source path|unsafe<label>tail|");
  });

  it("renders an empty candidate payload", () => {
    const payload = renderSlackDigest({
      reportDate: "2026-08-02",
      candidates: [],
      limit: 5
    });

    expect(JSON.stringify(payload)).toContain("No ranked digest candidates");
  });

  it("separates candidates into domain sections when source domains are provided", () => {
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: [
        candidate(),
        {
          ...candidate(),
          assessment: {
            ...candidate().assessment,
            id: "assessment_backend",
            trendItemId: "trend_backend"
          },
          trendItem: {
            ...candidate().trendItem,
            id: "trend_backend",
            title: "Backend framework release",
            sourceName: "Spring News"
          },
          lineage: [
            {
              assessmentId: "assessment_backend",
              sourceEvidenceId: "evidence_backend",
              sourceName: "Spring News",
              sourceUrl: "https://spring.io/blog/backend",
              confidenceScore: 0.85
            }
          ]
        }
      ],
      limit: 5,
      sourceDomainsByName: new Map([
        ["Example Source", "ai"],
        ["Spring News", "backend"]
      ])
    });
    const rendered = JSON.stringify(payload);

    expect(rendered).toContain("AI Signals");
    expect(rendered).toContain("Backend Signals");
    expect(rendered.indexOf("AI Signals")).toBeLessThan(rendered.indexOf("Backend Signals"));
  });

  it("keeps Slack blocks and section text under platform limits", () => {
    const longCandidate = {
      ...candidate(),
      assessment: {
        ...candidate().assessment,
        summary: "s".repeat(4000),
        whyItMatters: "w".repeat(4000),
        practicalImpact: "p".repeat(4000)
      },
      trendItem: {
        ...candidate().trendItem,
        title: `Model API release ${"t".repeat(4000)}`
      }
    };
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: Array.from({ length: 60 }, (_, index) => ({
        ...longCandidate,
        assessment: {
          ...longCandidate.assessment,
          id: `assessment_${index}`,
          trendItemId: `trend_${index}`
        },
        trendItem: {
          ...longCandidate.trendItem,
          id: `trend_${index}`
        }
      })),
      limit: 60
    });

    expect(payload.blocks.length).toBeLessThanOrEqual(50);
    payload.blocks.forEach((block) => {
      if (block.type === "header") {
        expect(block.text.text.length).toBeLessThanOrEqual(150);
      }
      if (block.type === "section") {
        expect(block.text.text.length).toBeLessThanOrEqual(3000);
      }
    });
    expect(JSON.stringify(payload)).toContain(".");
  });

  it("truncates long candidate fields before composing section text", () => {
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: [
        {
          ...candidate(),
          assessment: {
            ...candidate().assessment,
            summary: "s".repeat(4000),
            whyItMatters: "w".repeat(4000),
            practicalImpact: "p".repeat(4000)
          }
        }
      ],
      limit: 5
    });
    const renderedCandidate = payload.blocks.find(
      (block) => block.type === "section" && block.text.text.includes("*Summary:*")
    );

    expect(renderedCandidate?.type).toBe("section");
    if (!renderedCandidate || renderedCandidate.type !== "section") {
      throw new Error("Expected candidate section block");
    }
    expect(renderedCandidate.text.text).not.toContain("s".repeat(601));
    expect(renderedCandidate.text.text).not.toContain("w".repeat(601));
    expect(renderedCandidate.text.text).not.toContain("p".repeat(601));
    expect(renderedCandidate.text.text.length).toBeLessThanOrEqual(3000);
  });

  it("truncates long urgent text while keeping the urgent block under Slack limits", () => {
    const payload = renderSlackDigest({
      reportDate: "2026-08-01",
      candidates: Array.from({ length: 5 }, (_, index) => ({
        ...candidate(),
        assessment: {
          ...candidate().assessment,
          id: `assessment_${index}`,
          trendItemId: `trend_${index}`
        },
        trendItem: {
          ...candidate().trendItem,
          id: `trend_${index}`,
          title: `Urgent model ${index} ${"u".repeat(1000)}`
        }
      })),
      limit: 5
    });
    const urgentBlock = payload.blocks.find(
      (block) => block.type === "section" && block.text.text.startsWith("*Urgent:*")
    );

    expect(urgentBlock?.type).toBe("section");
    if (!urgentBlock || urgentBlock.type !== "section") {
      throw new Error("Expected urgent section block");
    }
    expect(urgentBlock.text.text.length).toBeLessThanOrEqual(3000);
    expect(urgentBlock.text.text).not.toContain("u".repeat(2901));
  });
});

function candidate(): DigestCandidate {
  return {
    assessment: {
      id: "assessment_one",
      trendItemId: "trend_one",
      reportDate: "2026-08-01",
      summary: "A model API was released.",
      whyItMatters: "It changes local evaluation priorities.",
      practicalImpact: "Review the API in the next evaluation pass.",
      trendCategory: "model",
      actionLevel: "do_now",
      confirmationStatus: "official_only",
      confidence: 0.85,
      importanceScore: 85,
      contradictionNotes: null,
      stalenessPolicy: "Recheck later",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    },
    trendItem: {
      id: "trend_one",
      canonicalUrl: "https://example.com/model-api",
      canonicalHash: "hash",
      title: "Model API release",
      sourceName: "Example Source",
      publishedAt: "2026-07-31T16:00:00.000Z"
    },
    lineage: [
      {
        assessmentId: "assessment_one",
        sourceEvidenceId: "evidence_one",
        sourceName: "Example Source",
        sourceUrl: "https://example.com/source",
        confidenceScore: 0.85
      }
    ]
  };
}
