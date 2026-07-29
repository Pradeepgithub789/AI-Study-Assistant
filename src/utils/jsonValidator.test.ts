import { describe, it, expect } from 'vitest';
import { repairJsonString, validateStudySession } from './jsonValidator';

describe('JSON Repair Pipeline', () => {
  it('should strip markdown code fences', () => {
    const raw = '```json\n{\n  "title": "Quantum Mechanics"\n}\n```';
    const repaired = repairJsonString(raw);
    expect(repaired).toBe('{\n  "title": "Quantum Mechanics"\n}');
  });

  it('should remove trailing commas in objects and arrays', () => {
    const raw = '{\n  "list": [1, 2, 3,],\n  "title": "Thermodynamics",\n}';
    const repaired = repairJsonString(raw);
    expect(JSON.parse(repaired)).toEqual({
      list: [1, 2, 3],
      title: "Thermodynamics"
    });
  });

  it('should balance unclosed curly braces and square brackets', () => {
    const raw = '{"title": "Fluid Dynamics", "topics": ["viscosity", "laminar';
    const repaired = repairJsonString(raw);
    expect(JSON.parse(repaired)).toEqual({
      title: "Fluid Dynamics",
      topics: ["viscosity", "laminar"]
    });
  });
});

describe('Zod Schema Validation', () => {
  it('should validate fully compliant study sessions', () => {
    const validSession = {
      title: "Introduction to Aerodynamics",
      summary: "This topic introduces lift, drag, and laminar boundary flows.",
      flashcards: [
        {
          front: "What is lift?",
          back: "Component of aerodynamic force perpendicular to the oncoming flow.",
          concept: "Fluid Dynamics",
          difficulty: "easy",
          confidence: "high"
        }
      ],
      quiz: [
        {
          question: "Which coefficient determines lift?",
          options: ["Cl", "Cd", "Re", "Pr"],
          correctAnswerIndex: 0,
          explanation: "Cl represents the coefficient of lift."
        }
      ],
      weak_topics: ["Boundary layers"],
      difficulty: "medium",
      estimated_study_time: "45 minutes",
      revision_tips: ["Study pressure distributions"],
      confidence_score: 85
    };

    const result = validateStudySession(JSON.stringify(validSession));
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Introduction to Aerodynamics");
  });

  it('should reject JSON sessions that miss critical fields', () => {
    // Missing 'summary' and 'quiz'
    const invalidSession = {
      title: "Aerodynamics",
      flashcards: [],
      difficulty: "easy",
      estimated_study_time: "30 minutes"
    };

    const result = validateStudySession(JSON.stringify(invalidSession));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Validation failed");
    expect(result.errorDetails).toContain("summary");
  });

  it('should reject unparseable broken strings and describe error details', () => {
    const rawText = "This is not a JSON string at all";
    const result = validateStudySession(rawText);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid AI response");
    expect(result.errorDetails).toContain("Failed to parse JSON");
  });
});
