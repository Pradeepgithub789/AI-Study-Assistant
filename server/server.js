import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Security Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for the development/internship submission
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID']
}));
app.use(express.json({ limit: '10mb' }));
// Rate Limiter: max 30 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: 'Rate limit exceeded',
    errorDetails: 'Too many study requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
// Zod Schemas for Validation
const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  concept: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
});
const MCQSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});
const DescriptiveQASchema = z.object({
  question: z.string(),
  answer: z.string(),
});
const ExamQuestionSchema = z.object({
  question: z.string(),
  key_points: z.array(z.string()),
});
const RoadmapNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['prerequisite', 'core', 'advanced', 'summary']).default('core'),
});
const RoadmapEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});
const RoadmapSchema = z.object({
  nodes: z.array(RoadmapNodeSchema),
  edges: z.array(RoadmapEdgeSchema),
});
const StudySessionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  flashcards: z.array(FlashcardSchema).min(1),
  quiz: z.array(MCQSchema).min(1),
  weak_topics: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimated_study_time: z.string().min(1),
  revision_tips: z.array(z.string()).default([]),
  confidence_score: z.number().min(0).max(100),
  descriptive_qa: z.array(DescriptiveQASchema).optional().default([]),
  exam_questions: z.array(ExamQuestionSchema).optional().default([]),
  key_takeaways: z.array(z.string()).optional().default([]),
  revision_notes: z.string().optional().default(''),
  roadmap: RoadmapSchema.optional(),
  isTopic: z.boolean().optional().default(false),
});
// Gemini Schema Definition for Structured Output
const geminiResponseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
          concept: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["front", "back", "concept", "difficulty", "confidence"]
      }
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" }
          },
          correctAnswerIndex: { type: "integer" },
          explanation: { type: "string" }
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"]
      }
    },
    weak_topics: {
      type: "array",
      items: { type: "string" }
    },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    estimated_study_time: { type: "string" },
    revision_tips: {
      type: "array",
      items: { type: "string" }
    },
    confidence_score: { type: "integer" },
    descriptive_qa: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "answer"]
      }
    },
    exam_questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          key_points: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["question", "key_points"]
      }
    },
    key_takeaways: {
      type: "array",
      items: { type: "string" }
    },
    revision_notes: { type: "string" },
    roadmap: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              description: { type: "string" },
              type: { type: "string", enum: ["prerequisite", "core", "advanced", "summary"] }
            },
            required: ["id", "label", "description", "type"]
          }
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" }
            },
            required: ["from", "to"]
          }
        }
      },
      required: ["nodes", "edges"]
    }
  },
  required: [
    "title", "summary", "flashcards", "quiz", "weak_topics",
    "difficulty", "estimated_study_time", "revision_tips", "confidence_score",
    "descriptive_qa", "exam_questions", "key_takeaways", "revision_notes",
    "roadmap"
  ]
};
/**
 * Single syntax-only JSON repair mechanism.
 * Balances braces, strips markdown blocks, and removes trailing commas.
 */
function repairJsonSyntax(raw) {
  let clean = raw.trim();
  // Strip markdown code fences if present
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  clean = clean.trim();
  // Remove trailing commas before closing braces or brackets
  clean = clean.replace(/,\s*([}\]])/g, '$1');
  // Balance brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
    escaped = false;
  }
  while (braceCount > 0) {
    clean += '}';
    braceCount--;
  }
  while (bracketCount > 0) {
    clean += ']';
    bracketCount--;
  }
  return clean;
}
// Request Timeout Middleware: 30 seconds
const timeoutMiddleware = (req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(504).json({
      error: 'Timeout',
      errorDetails: 'The request took longer than 30 seconds to process. Please try again with shorter study notes.'
    });
  });
  next();
};
app.post('/api/generate', timeoutMiddleware, async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  // Setup AbortController for cancel propagation
  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
  });
  try {
    const { content, difficulty = 'medium', isTopic = false } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        errorDetails: 'Content body must be a non-empty string.'
      });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        errorDetails: 'Google Gemini API key is not configured. Please add it to the server .env file.'
      });
    }
    // Initialize Gemini API Client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema,
        temperature: 0.15,
      }
    });
    const systemPrompt = `You are a premium study assistant. Your goal is to process the user's study materials (notes, textbook paragraphs, topics) and return an interactive, premium study session.
    Analyze the contents at a '${difficulty.toUpperCase()}' study level.
    
    If the user input is a brief topic name or concept (e.g. "Keplerian Mechanics", "Quantum computing", "Laminar vs Turbulent flow") rather than a full page of notes/document (isTopic is ${isTopic}):
    - Act as a master subject-matter expert on this topic.
    - Generate the entire comprehensive information about this topic yourself. Do not assume the user has provided any content other than the topic title.
    - Make the generated "summary" extremely detailed, comprehensive, and exhaustive (at least 4-5 long paragraphs) covering background, core principles, equations/formulas, advanced details, and real-world applications.
    - Generate all flashcards and quiz questions based on the broad scope of this topic.
    
    Instructions:
    1. Extract/generate the core concept definitions and make a minimum of 10 (up to 18) highly interactive double-sided flashcards covering all minor and major details.
    2. Write a minimum of 10 (up to 15) multiple-choice quiz questions (MCQs) with exactly 4 options and detailed explanations of the correct answer.
    3. Generate a comprehensive, detailed, and expanded multi-paragraph summary of the concepts, list weak topics to focus on, estimated study time, and list key revision tips.
    4. Provide a confidence score for each card (high, medium, or low) based on how complex it is, and a total confidence score for the entire session.
    5. Construct a logical learning roadmap ("roadmap" object with "nodes" and "edges") representing the concept graph or step-by-step path to master this topic. Generate at least 5 progressive nodes (e.g., prerequisite/basics, core concepts, intermediate equations, advanced applications, summary/review).
    6. Always format mathematical equations, formulas, and symbols in valid LaTeX format: wrap inline equations/symbols with single dollar signs (e.g. $E = mc^2$, $\pi$, $\lambda$) and block equations with double dollar signs (e.g. $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$). This formatting must be used consistently in titles, summaries, flashcards (front/back), quiz questions, options, explanations, and roadmap node labels/descriptions.
    7. Always return strictly valid JSON matching this schema:
    {
      "title": "Session Title",
      "summary": "Detailed summary...",
      "flashcards": [
        { "front": "Question/concept", "back": "Answer", "concept": "Concept category", "difficulty": "easy|medium|hard", "confidence": "low|medium|high" }
      ],
      "quiz": [
        { "question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswerIndex": 0, "explanation": "Why it is correct..." }
      ],
      "weak_topics": ["Topic A"],
      "difficulty": "${difficulty}",
      "estimated_study_time": "Estimated duration (e.g. 45 mins)",
      "revision_tips": ["Tip 1"],
      "confidence_score": 85,
      "descriptive_qa": [
        { "question": "Question?", "answer": "Answer..." }
      ],
      "exam_questions": [
        { "question": "Exam question?", "key_points": ["point 1"] }
      ],
      "key_takeaways": ["Takeaway 1"],
      "revision_notes": "Revision notes...",
      "roadmap": {
        "nodes": [
          { "id": "1", "label": "Topic Intro", "description": "Prerequisite details", "type": "prerequisite" },
          { "id": "2", "label": "Core Mechanism", "description": "Core explanation", "type": "core" },
          { "id": "3", "label": "Key Equations", "description": "Mathematical formulations", "type": "core" },
          { "id": "4", "label": "Advanced Practice", "description": "Real-world engineering applications", "type": "advanced" },
          { "id": "5", "label": "Summary & Exam Prep", "description": "Synthesized review", "type": "summary" }
        ],
        "edges": [
          { "from": "1", "to": "2" },
          { "from": "2", "to": "3" },
          { "from": "3", "to": "4" },
          { "from": "4", "to": "5" }
        ]
      }
    }`;
    const promptText = `Study Material:\n${content}\n\nSelected Difficulty: ${difficulty}`;
    // Invoke Gemini API with signal and timeout options
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      systemInstruction: systemPrompt
    }, {
      signal: controller.signal,
      timeout: 30000
    });
    const apiLatency = Date.now() - startTime;
    let responseText = result.response.text();
    if (!responseText) {
      throw new Error("Empty response received from Gemini API");
    }
    // Strip markdown code fences if present before parsing
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    responseText = responseText.trim();
    let parsedResponse;
    let isRepaired = false;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseErr) {
      try {
        const repairedText = repairJsonSyntax(responseText);
        parsedResponse = JSON.parse(repairedText);
        isRepaired = true;
      } catch (repairErr) {
        return res.status(502).json({
          error: 'Invalid AI response',
          errorDetails: `Gemini output is not valid JSON and could not be repaired: ${parseErr.message}\nRaw Text: ${responseText.substring(0, 500)}`
        });
      }
    }
    // Server-side Zod verification as a second safety layer
    const validated = StudySessionSchema.safeParse(parsedResponse);
    if (!validated.success) {
      const fieldErrors = validated.error.errors
        .map(e => `- ${e.path.join('.')}: ${e.message}`)
        .join('\n');
      return res.status(502).json({
        error: 'Validation failed',
        errorDetails: `The generated JSON from the model did not match the required Zod schema:\n${fieldErrors}`
      });
    }
    const duration = Date.now() - startTime;
    // Send successful response with metadata headers/fields matching required format
    return res.status(200).json({
      success: true,
      data: {
        ...validated.data,
        isRepaired,
        isTopic
      },
      metadata: {
        requestId,
        model: 'gemini-3.5-flash-lite',
        apiLatency,
        totalDuration: duration,
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Request ${requestId} failed:`, error);
    let status = 500;
    let errorType = 'Invalid AI response';
    let details = error.message || 'An unexpected error occurred.';
    if (error.name === 'AbortError' || error.message?.includes('abort')) {
      console.log(`Request ${requestId} was cancelled by the client.`);
      return; // Connection closed, do not send response
    }
    // Check for Gemini specific error codes
    if (error.status === 403 || error.status === 401) {
      status = error.status;
      errorType = 'Invalid API key';
      details = 'The provided Google Gemini API key is invalid or unauthorized. Please verify your .env configuration.';
    } else if (error.status === 429) {
      status = 429;
      errorType = 'Rate limit exceeded';
      details = 'Gemini API quota or rate limit exceeded. Please wait a moment and try again.';
    } else if (error.code === 'ENOTFOUND' || error.message?.includes('fetch') || error.message?.includes('network')) {
      status = 502;
      errorType = 'Network failure';
      details = 'Failed to connect to Google Gemini service. Verify your internet connection.';
    } else if (error.status === 504 || error.message?.includes('timeout')) {
      status = 504;
      errorType = 'Timeout';
      details = 'Gemini request timed out after 30 seconds.';
    }
    return res.status(status).json({
      error: errorType,
      errorDetails: details,
      metadata: {
        requestId,
        totalDuration: duration
      }
    });
  }
});
// ==============================
// Document Chat Endpoint
// ==============================
// ==============================
// Document Chat Endpoint
// ==============================
app.post('/api/chat', async (req, res) => {
  try {
    const { documentContext, question, history = [], isTopic = false } = req.body;
    if (!documentContext || !question) {
      return res.status(400).json({
        error: "Missing documentContext or question."
      });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({
        error: "Google Gemini API key is not configured."
      });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite"
    });
    const systemInstruction = isTopic
      ? `You are an expert AI Study Assistant.
The user is studying the topic: "${documentContext}".
Provide a clear, detailed, and comprehensive answer to the user's question.
Feel free to use your general knowledge to explain concepts, formulas, theories, historical contexts, and details related to this topic.
Keep your answers accurate, well-structured, and helpful for a student.
- Always format all mathematical equations, formulas, and symbols in valid LaTeX format: wrap inline equations/symbols with single dollar signs (e.g., $E = mc^2$ or $\pi$ or $\theta$) and block equations with double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$). Never output raw, unwrapped math equations.`
      : `You are an AI Study Assistant.
Rules:
- Answer ONLY using the provided document.
- If the answer is not in the document, reply:
  "I couldn't find that information in the uploaded document."
- Be concise and accurate.
- Use bullet points when helpful.
- Preserve technical terms.
- Always format all mathematical equations, formulas, and symbols in valid LaTeX format: wrap inline equations/symbols with single dollar signs (e.g., $E = mc^2$ or $\pi$ or $\theta$) and block equations with double dollar signs (e.g., $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$). Never output raw, unwrapped math equations.`;
    const historyText = history
      .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");
    const prompt = isTopic
      ? `TOPIC:
${documentContext}
PREVIOUS CHAT:
${historyText}
QUESTION:
${question}`
      : `DOCUMENT:
${documentContext}
PREVIOUS CHAT:
${historyText}
QUESTION:
${question}`;
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      systemInstruction
    });
    const answer = result.response.text();
    return res.json({
      answer
    });
  } catch (error) {
    console.error("Document Chat Error:", error);
    return res.status(500).json({
      error: "Failed to get reply from AI Study Assistant."
    });
  }
});
app.listen(PORT, () => {
  console.log(`Secure study assistant backend running on http://localhost:${PORT}`);
});