import { z } from 'zod';

export const FlashcardSchema = z.object({
  front: z.string().min(1, "Question/front cannot be empty"),
  back: z.string().min(1, "Answer/back cannot be empty"),
  concept: z.string().min(1, "Concept category cannot be empty"),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const MCQSchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
  options: z.array(z.string()).length(4, "Must contain exactly 4 options"),
  correctAnswerIndex: z.number().int().min(0).max(3, "Correct answer index must be between 0 and 3"),
  explanation: z.string().min(1, "Explanation cannot be empty"),
});

export const RoadmapNodeSchema = z.object({
  id: z.string().min(1, "ID cannot be empty"),
  label: z.string().min(1, "Label cannot be empty"),
  description: z.string().min(1, "Description cannot be empty"),
  type: z.enum(['prerequisite', 'core', 'advanced', 'summary']).default('core'),
});

export const RoadmapEdgeSchema = z.object({
  from: z.string().min(1, "From node ID cannot be empty"),
  to: z.string().min(1, "To node ID cannot be empty"),
});

export const RoadmapSchema = z.object({
  nodes: z.array(RoadmapNodeSchema),
  edges: z.array(RoadmapEdgeSchema),
});

export const StudySessionSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  summary: z.string().min(1, "Summary cannot be empty"),
  flashcards: z.array(FlashcardSchema).min(1, "Must generate at least 1 flashcard"),
  quiz: z.array(MCQSchema).min(1, "Must generate at least 1 quiz question"),
  weak_topics: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimated_study_time: z.string().min(1, "Estimated study time cannot be empty"),
  revision_tips: z.array(z.string()).default([]),
  confidence_score: z.number().min(0).max(100),
  rawContent: z.string().optional().default(''),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().default([]),
  roadmap: RoadmapSchema.optional(),
  isTopic: z.boolean().optional().default(false),
  pdfName: z.string().optional(),
  pdfPages: z.number().optional(),
  pdfSize: z.string().optional(),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;
export type MCQ = z.infer<typeof MCQSchema>;
export type StudySession = z.infer<typeof StudySessionSchema>;

/**
 * Attempts to repair JSON syntax anomalies (trailing commas, markdown fences, unclosed brackets).
 * It does NOT invent missing fields or fabricate mockup content.
 */
export function repairJsonString(jsonStr: string): string {
  let cleaned = jsonStr.trim();

  // 1. Strip markdown fences if present
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/, '');
  cleaned = cleaned.trim();

  // 2. Remove trailing commas before closing braces/brackets in JSON array/object contexts
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 3. Stack-based bracket balancer
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if (char === '}') {
        if (stack[stack.length - 1] === '}') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack[stack.length - 1] === ']') {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    cleaned += '"';
  }
  
  // Close everything in reverse order (pop from stack)
  while (stack.length > 0) {
    cleaned += stack.pop();
  }

  return cleaned;
}

interface ValidationResult {
  success: boolean;
  data?: StudySession;
  error?: string;
  errorDetails?: string;
}

/**
 * Parses and validates the generated JSON string.
 */
export function validateStudySession(rawText: string): ValidationResult {
  let parsedJson: any;
  let isRepaired = false;

  // 1. Try to parse directly
  try {
    parsedJson = JSON.parse(rawText);
  } catch (initialErr: any) {
    // 2. Try syntax repair
    try {
      const repairedText = repairJsonString(rawText);
      parsedJson = JSON.parse(repairedText);
      isRepaired = true;
    } catch (repairErr: any) {
      return {
        success: false,
        error: "Invalid AI response",
        errorDetails: `Failed to parse JSON even after syntax repair attempts.\nOriginal: ${initialErr.message}\nRepair: ${repairErr.message}`,
      };
    }
  }

  // 3. Validate schema using Zod
  const result = StudySessionSchema.safeParse(parsedJson);
  if (!result.success) {
    const formattedErrors = result.error.issues
      .map(err => `- ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    return {
      success: false,
      error: "Validation failed",
      errorDetails: `Zod Validation Schema Mismatch (Repaired: ${isRepaired ? 'Yes' : 'No'}):\n${formattedErrors}`,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
