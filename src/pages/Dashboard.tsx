import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Copy,
  Check,
  XCircle,
  RefreshCw,
  Paperclip
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useStudyStore } from '../store/studyStore';
import { validateStudySession } from '../utils/jsonValidator';
import { extractTextFromPdf } from '../utils/pdfExtractor';

const TECHNICAL_PROMPTS = [
  "Explain Quantum Computing basics and superposition.",
  "Summarize Thermodynamics Laws with mechanical efficiency.",
  "Compare Laminar vs Turbulent fluid boundary layers.",
  "Break down AC vs DC electrical induction motor principles.",
  "Explain the differences between REST and gRPC API designs.",
  "Describe the mechanics of Keplerian orbital maneuvers and delta-v.",
  "Explain the difference between TCP and UDP transmission controls.",
  "How does a Fourier Transform convert signals into frequency domains?",
  "Break down the stress-strain behavior of structural steel members.",
  "Explain the operation of CMOS transistors in NAND gate logic.",
  "Summarize the Navier-Stokes equations for fluid motion dynamics.",
  "Describe the difference between SQL indexing and NoSQL document sharding.",
  "Explain the principle of operation of a brushless DC (BLDC) motor.",
  "How does the Paxos consensus algorithm guarantee data replication integrity?",
  "Summarize the catalytic cracking process in petrochemical refining."
];

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  useEffect(() => {
    const shuffled = [...TECHNICAL_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 4));
  }, []);

  const [uploadedPdfInfo, setUploadedPdfInfo] = useState<{
    name: string;
    size: string;
    pageCount: number;
  } | null>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.pdf')) {
      toast.promise(
        extractTextFromPdf(file).then((pages) => {
          const fullText = pages.map(p => p.text).join('\n\n');
          setNotes(fullText);
          setUploadedPdfInfo({
            name: file.name,
            size: formatBytes(file.size),
            pageCount: pages.length
          });
        }),
        {
          loading: `Extracting text pages from ${file.name}...`,
          success: `Successfully parsed and loaded ${file.name}!`,
          error: (err) => err.message || "Failed to extract text from PDF."
        }
      );
      return;
    }

    if (file.name.endsWith('.docx')) {
      toast.promise(
        file.arrayBuffer().then((arrayBuffer) => {
          const mammoth = (window as any).mammoth;
          if (!mammoth) {
            throw new Error("Mammoth.js library is not yet loaded on window. Please wait.");
          }
          return mammoth.extractRawText({ arrayBuffer });
        }).then((result) => {
          setNotes(result.value);
          setUploadedPdfInfo(null);
        }),
        {
          loading: `Extracting text from ${file.name}...`,
          success: `Successfully parsed and loaded ${file.name}!`,
          error: (err) => err.message || "Failed to extract text from DOCX."
        }
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setNotes(text);
        setUploadedPdfInfo(null);
        toast.success(`Successfully attached and loaded ${file.name}!`);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the file. Please ensure it is a text-based file.");
    };
    reader.readAsText(file);
  };

  const {
    setSession,
    addRequestLog,
    sessionHistory,
    requestHistory,
    generateTrigger,
    setDevMetrics
  } = useStudyStore();

  const [notes, setNotes] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadingTime, setLoadingTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Error States
  const [errorState, setErrorState] = useState<{
    error: string;
    details: string;
    showAccordion: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Auto-resize notes textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
    }
  }, [notes]);

  // Handle keyboard submit via Ctrl + Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Remote trigger check from Command Palette
  useEffect(() => {
    if (generateTrigger > 0 && notes.trim()) {
      handleGenerate();
    } else if (generateTrigger > 0 && !notes.trim()) {
      toast.error("Type or paste some notes first!");
    }
  }, [generateTrigger]);

  // Progressive loading texts carousel
  useEffect(() => {
    if (!isLoading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const stages = [
      "Establishing link with Gemini API...",
      "Analyzing notes vocabulary and symbols...",
      "Generating structured study summary...",
      "Extracting concepts for active recall flashcards...",
      "Compiling multiple-choice quiz scenarios...",
      "Evaluating cognitive confidence levels...",
      "Validating output Zod schemas...",
      "Almost done, wrapping up study node..."
    ];

    let currentIdx = 0;
    setLoadingStage(stages[0]);
    setLoadingTime(0);

    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % stages.length;
      setLoadingStage(stages[currentIdx]);
    }, 2800);

    const timeInterval = setInterval(() => {
      setLoadingTime(t => t + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [isLoading]);

  // Main Generation Handler
  const handleGenerate = async () => {
    if (!notes.trim()) {
      toast.error("Please enter study notes or a concept!");
      return;
    }

    setIsLoading(true);
    setErrorState(null);
    setDevMetrics(null);

    // Optimistic layout change: navigate focus immediately or let layout transitions animate

    // 1. Cancel previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.dismiss();
      toast.loading("Aborted previous request, generating new session...");
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestStartTime = performance.now();
    const requestId = `req-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const isTopic = !notes.includes('\n') && notes.trim().length < 300;
      // API call to backend
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/generate`,
        { content: notes, difficulty, isTopic },
        {
          signal: controller.signal,
          headers: { 'X-Request-ID': requestId }
        }
      );

      const firstResponseTime = performance.now() - requestStartTime;

      const parseStartTime = performance.now();
      const rawText = JSON.stringify(response.data.data);
      const validationResult = validateStudySession(rawText);
      const parseTime = performance.now() - parseStartTime;

      if (!validationResult.success) {
        throw {
          isCustom: true,
          error: validationResult.error || 'Validation failed',
          details: validationResult.errorDetails || 'Data fields schema validation failed.'
        };
      }

      // Record request history log in Zustand
      addRequestLog({
        topic: notes.substring(0, 45) + (notes.length > 45 ? '...' : ''),
        responseTime: Math.round(firstResponseTime),
        status: 'success'
      });

      // Record developer telemetry details
      setDevMetrics({
        firstResponseTime: Math.round(firstResponseTime),
        parseTime: Math.round(parseTime),
        requestId,
        model: response.data.metadata?.model || 'gemini-2.5-flash',
        isValid: true,
        isRepaired: response.data.data.isRepaired || false,
        renderTime: 0 // Will be measured via Performance API in Study.tsx
      });

      // Load session in Zustand store
      setSession({
        ...validationResult.data!,
        rawContent: notes,
        chatHistory: [],
        isTopic: response.data.data.isTopic || isTopic,
        pdfName: uploadedPdfInfo?.name,
        pdfPages: uploadedPdfInfo?.pageCount,
        pdfSize: uploadedPdfInfo?.size
      });

      toast.success("Study session compiled successfully!");
      navigate('/study');

    } catch (err: any) {
      if (axios.isCancel(err)) {
        console.log("Stale query request aborted.");
        return;
      }

      const firstResponseTime = performance.now() - requestStartTime;

      let errorName = 'Network error';
      let errorDetails = err.message || 'The secure backend could not be reached.';

      if (err.isCustom) {
        errorName = err.error;
        errorDetails = err.details;
      } else if (err.response?.data) {
        errorName = err.response.data.error || 'Invalid AI response';
        errorDetails = err.response.data.errorDetails || 'The server returned an unparseable response.';
      } else if (!err.response) {
        errorName = 'Server Unavailable';
        errorDetails = 'Could not establish connection to the AI Study Assistant backend. Since it is deployed on Render, the server might be spinning up after inactivity (this can take up to 50 seconds). Please wait a moment and try again.';
      }

      // Log request failure
      addRequestLog({
        topic: notes.substring(0, 45) + (notes.length > 45 ? '...' : ''),
        responseTime: Math.round(firstResponseTime),
        status: 'failure',
        errorType: errorName
      });

      // Set metrics
      setDevMetrics({
        firstResponseTime: Math.round(firstResponseTime),
        parseTime: 0,
        requestId,
        model: 'gemini-2.5-flash',
        isValid: false,
        isRepaired: false,
        errorDetails: errorDetails
      });

      setErrorState({
        error: errorName,
        details: errorDetails,
        showAccordion: false
      });

      toast.error(`Study assistant compilation failed: ${errorName}`);
      setIsLoading(false);
    }
  };

  const copyErrorDetails = () => {
    if (!errorState) return;
    const details = `Error: ${errorState.error}\nDiagnostics:\n${errorState.details}`;
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-10 min-h-[85vh] flex flex-col justify-between">

      {/* Background blobs for premium glassmorphic depth */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-violet-600/5 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-10 left-10 w-[40vw] h-[40vh] bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {!isLoading && !errorState ? (
          <motion.div
            key="input-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-10 flex-grow flex flex-col justify-center"
          >
            {/* Hero Headers */}
            <div className="text-center space-y-4 max-w-4xl mx-auto w-full">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center space-x-2 bg-violet-600/10 border border-violet-500/20 px-3.5 py-1.5 rounded-full text-violet-400 text-xs font-semibold uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Study Ingestion Node</span>
              </motion.div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] dark:text-white light:text-slate-900">
                Turn dry textbooks into <br />
                <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  interactive study maps.
                </span>
              </h1>

              <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto dark:text-slate-400 light:text-slate-500">
                Paste technical notes, topics or syllabus paragraphs. Our system parses and validates LLM schemas to generate 3D flashcards, quizzes, and key summaries.
              </p>
            </div>

            {/* Input Segment */}
            {uploadedPdfInfo ? (
              <div className="max-w-2xl w-full mx-auto glass-premium p-6 sm:p-8 rounded-3xl relative border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.15)] flex flex-col space-y-6">
                {/* Hidden input for new uploads */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.json,.js,.ts,.tsx,.css,.html,.pdf"
                  className="hidden"
                />

                {/* Close Button to cancel the upload */}
                <button
                  onClick={() => {
                    setUploadedPdfInfo(null);
                    setNotes('');
                  }}
                  className="absolute top-5 right-5 p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition dark:hover:bg-slate-800"
                  title="Remove document"
                >
                  <XCircle className="w-5 h-5" />
                </button>

                {/* PDF Details Header */}
                <div className="flex items-start space-x-4">
                  {/* Premium PDF Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500/10 to-red-500/15 border border-rose-500/25 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/5">
                    <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-grow pr-6">
                    <h3 className="text-base font-bold text-white truncate leading-snug">
                      {uploadedPdfInfo.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="font-mono">{uploadedPdfInfo.size}</span>
                      <span className="text-slate-700 dark:text-slate-700 light:text-slate-200">•</span>
                      <span>{uploadedPdfInfo.pageCount} {uploadedPdfInfo.pageCount === 1 ? 'page' : 'pages'}</span>
                      <span className="text-slate-700 dark:text-slate-700 light:text-slate-200">•</span>
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider text-[9px] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block"></span>
                        AI Ready
                      </span>
                    </div>
                  </div>
                </div>

                {/* Difficulty Selector within Card */}
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between dark:bg-slate-950/60 dark:border-slate-850 light:bg-slate-50 light:border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 w-full sm:w-auto text-left">Target Difficulty</span>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 dark:bg-slate-950 dark:border-slate-850 light:bg-white light:border-slate-200">
                    {(['easy', 'medium', 'hard'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg uppercase tracking-wide transition duration-155 ${difficulty === level
                            ? 'bg-violet-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 light:text-slate-500 light:hover:text-slate-900'
                          }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Workspace Button */}
                <button
                  onClick={handleGenerate}
                  className="w-full inline-flex items-center justify-center space-x-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-4 rounded-2xl text-sm font-bold shadow-lg shadow-violet-600/15 hover:shadow-violet-600/25 transition-all duration-200 active:scale-[0.99]"
                >
                  <span>Generate Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="max-w-5xl w-full mx-auto glass-premium p-5 sm:p-7 rounded-3xl relative focus-within:border-violet-500/40 focus-within:shadow-[0_0_25px_rgba(139,92,246,0.12)]">
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.json,.js,.ts,.tsx,.css,.html,.pdf"
                    className="hidden"
                  />
                  <textarea
                    id="study-notes-textarea"
                    ref={textareaRef}
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste your study materials, lecture summaries or textbook formulas here... (Ctrl + Enter to trigger)"
                    className="w-full bg-slate-950/60 border border-slate-800 text-slate-100 rounded-2xl p-4 pr-20 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 resize-none font-sans min-h-[120px] max-h-[260px] dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-100 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />

                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={triggerFileInput}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition dark:hover:bg-slate-800 light:hover:bg-slate-200"
                      title="Attach text file (.txt, .md)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </motion.button>
                    {notes.trim() && (
                      <motion.button
                        whileHover={{ scale: 1.15, rotate: -10 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setNotes('')}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition dark:hover:bg-slate-800 light:hover:bg-slate-200"
                        title="Clear input"
                      >
                        <XCircle className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-slate-850 dark:border-slate-850 light:border-slate-100 gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Difficulty</span>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 dark:bg-slate-950 dark:border-slate-850 light:bg-slate-50 light:border-slate-200">
                      {(['easy', 'medium', 'hard'] as const).map((level) => (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg uppercase tracking-wide transition duration-150 ${difficulty === level
                              ? 'bg-violet-600 text-white font-bold'
                              : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 light:text-slate-500 light:hover:text-slate-900'
                            }`}
                        >
                          {level}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className="text-[10px] text-slate-500 font-semibold font-mono">
                      {notes.length} characters
                    </span>

                    <button
                      onClick={handleGenerate}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 btn-3d-violet px-7 py-3.5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
                    >
                      <span>Generate Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Prompt templates */}
            <div className="max-w-5xl w-full mx-auto space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center sm:text-left">Suggested Engineering Prompts</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {randomPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setNotes(prompt)}
                    className="text-left px-4 py-3 rounded-2xl border border-slate-850 bg-slate-900/20 text-xs text-slate-400 hover:text-violet-300 hover-card-glow leading-relaxed dark:border-slate-850 dark:bg-slate-900/20 light:bg-slate-100 light:border-slate-200 light:text-slate-660 light:hover:bg-slate-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent generated sessions from LocalStorage */}
            {sessionHistory.length > 0 && (
              <div className="max-w-5xl w-full mx-auto space-y-4 pt-4">
                <div className="flex items-center space-x-2 text-slate-400">
                  <HistoryIcon className="w-4 h-4 text-violet-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Recent Ingested Sessions</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sessionHistory.slice(0, 4).map((session, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSession(session);
                        navigate('/study');
                      }}
                      className="glass p-4 rounded-2xl border border-slate-850 bg-slate-900/10 hover-card-glow cursor-pointer relative group dark:border-slate-850 light:bg-slate-100 light:border-slate-200"
                    >
                      <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-white dark:text-slate-200 light:text-slate-900">{session.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{session.summary}</p>

                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>{session.difficulty}</span>
                        <span>{session.estimated_study_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : isLoading ? (
          <motion.div
            key="loading-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center space-y-8 max-w-5xl w-full mx-auto py-12"
          >
            {/* SaaS AI thinking concentric loader */}
            <div className="flex flex-col items-center space-y-4 mb-6">
              <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Outer breathing glow ring */}
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping opacity-75"></div>
                {/* Rotating border gradient */}
                <div className="absolute inset-0 rounded-full border border-violet-500/20 border-t-cyan-400 animate-spin"></div>
                {/* Central pulsing core */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.5)] flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 animate-pulse"></div>
                </div>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Compiling Study Guide...
              </h2>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                <p className="text-sm font-semibold tracking-wide text-violet-400 font-sans">{loadingStage}</p>
              </div>
            </div>

            {/* Layout representation skeleton (Optimistic layout transition) */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 opacity-45">
              <div className="md:col-span-1 space-y-4">
                {/* Summary box skeleton */}
                <div className="glass p-5 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/20 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded-lg w-1/3"></div>
                  <div className="h-3 bg-slate-800 rounded-lg w-full"></div>
                  <div className="h-3 bg-slate-800 rounded-lg w-full"></div>
                  <div className="h-3 bg-slate-800 rounded-lg w-4/5"></div>
                </div>

                {/* analytics skeleton */}
                <div className="glass p-5 rounded-3xl border border-slate-800 space-y-3 bg-slate-900/20 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded-lg w-1/2"></div>
                  <div className="h-8 bg-slate-800 rounded-xl w-full"></div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                {/* flashcards card skeleton */}
                <div className="glass p-8 rounded-3xl border border-slate-800 bg-slate-900/20 h-44 flex flex-col justify-between animate-pulse">
                  <div className="h-3 bg-slate-800 rounded-lg w-1/4"></div>
                  <div className="h-5 bg-slate-850 rounded-lg w-3/4 mx-auto my-4"></div>
                  <div className="h-3 bg-slate-800 rounded-lg w-1/5 ml-auto"></div>
                </div>

                {/* quiz item skeleton */}
                <div className="glass p-5 rounded-3xl border border-slate-800 bg-slate-900/20 space-y-3 animate-pulse">
                  <div className="h-3 bg-slate-800 rounded-lg w-full"></div>
                  <div className="h-8 bg-slate-800 rounded-xl w-full"></div>
                  <div className="h-8 bg-slate-800 rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Detailed Error Boundary screen */
          <motion.div
            key="error-stage"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center max-w-xl w-full mx-auto py-10"
          >
            <div className="glass p-8 rounded-3xl border border-red-500/20 bg-slate-900/30 backdrop-blur-xl relative overflow-hidden w-full dark:border-red-500/20 light:bg-white light:border-red-200 light:shadow-xl">

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertOctagon className="w-7 h-7 text-red-500" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight dark:text-white light:text-slate-900">Study Node Ingest Blocked</h2>
                  <p className="text-xs text-slate-400 max-w-xs dark:text-slate-400 light:text-slate-500">
                    The cognitive processing layer returned an error. Your original note text is preserved below to retry.
                  </p>
                </div>

                {/* Collapsed Diagnostic Accordion */}
                <div className="w-full border border-slate-850 bg-slate-950 rounded-2xl overflow-hidden text-left dark:border-slate-850 dark:bg-slate-950 light:bg-slate-50 light:border-slate-200">
                  <button
                    onClick={() => setErrorState(prev => prev ? { ...prev, showAccordion: !prev.showAccordion } : null)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition focus:outline-none dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900"
                  >
                    <div className="flex items-center space-x-2 text-red-400">
                      <span>Error Code: {errorState?.error}</span>
                    </div>
                    {errorState?.showAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {errorState?.showAccordion && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-slate-850 dark:border-slate-850 light:border-slate-200"
                      >
                        <div className="p-4 text-[11px] font-mono text-slate-500 bg-slate-950 leading-relaxed max-h-48 overflow-y-auto break-all dark:bg-slate-950 light:bg-slate-100">
                          {errorState?.details}
                        </div>
                        <div className="px-4 py-2 bg-slate-950 flex justify-end dark:bg-slate-950 light:bg-slate-100">
                          <button
                            onClick={copyErrorDetails}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-[10px] text-slate-400 rounded-lg border border-slate-800 transition dark:bg-slate-900 light:bg-white light:border-slate-200 light:text-slate-500"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Stack Details</span>
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row w-full gap-3 pt-2">
                  <button
                    onClick={() => {
                      setErrorState(null);
                      setIsLoading(false);
                    }}
                    className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-800 px-5 py-3 rounded-2xl text-xs font-semibold transition active:scale-[0.98] dark:bg-slate-900 dark:border-slate-800 light:bg-slate-100 light:border-slate-200 light:text-slate-700"
                  >
                    <span>Edit Note Input</span>
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-2xl text-xs font-bold tracking-wide shadow-lg shadow-violet-600/20 transition active:scale-[0.98]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate Study</span>
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request History Log footer tray */}
      {requestHistory.length > 0 && !isLoading && !errorState && (
        <div className="mt-12 pt-8 border-t border-slate-900 max-w-5xl w-full mx-auto space-y-3 dark:border-slate-900 light:border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Request Integrity History Log</h3>
            <button
              onClick={() => {
                if (window.confirm("Clear all logs?")) {
                  useStudyStore.getState().clearHistory();
                  toast.success("Logs deleted!");
                }
              }}
              className="text-[9px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-400 transition"
            >
              Clear Logs
            </button>
          </div>

          <div className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-950/20 divide-y divide-slate-900/50 text-[10px] max-h-40 overflow-y-auto dark:border-slate-900 light:bg-slate-50 light:border-slate-200 light:divide-slate-200">
            {requestHistory.map((log, idx) => (
              <div key={idx} className="px-4 py-2.5 flex items-center justify-between font-mono text-slate-500 dark:text-slate-500 light:text-slate-600">
                <div className="flex items-center space-x-3 truncate mr-4">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 dark:bg-slate-900 light:bg-white light:border-slate-200">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold text-slate-400 truncate dark:text-slate-400 light:text-slate-800">{log.topic}</span>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className="text-[9px] font-semibold">{log.responseTime}ms</span>
                  {log.status === 'success' ? (
                    <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-bold uppercase">SUCCESS</span>
                  ) : (
                    <span
                      className="px-1.5 py-0.5 text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md font-bold uppercase cursor-pointer"
                      title={log.errorType}
                    >
                      FAILED ({log.errorType})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
