import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  HelpCircle,
  Sparkles,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Bookmark,
  Star,
  Search,
  Filter,
  Timer,
  Award,
  RefreshCw,
  Terminal,
  Maximize2,
  Minimize2,
  ListOrdered,
  MessageSquare,
  Send,
  BookCheck,
  ClipboardList,
  GitFork
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { useStudyStore, StudyTab } from '../store/studyStore';
import { Flashcard, MCQ, StudySession } from '../utils/jsonValidator';

export const Study: React.FC = () => {
  const navigate = useNavigate();

  const {
    currentSession,
    activeTab,
    setActiveTab,
    devMode,
    devMetrics,
    reorderFlashcards,
    setDevMetrics
  } = useStudyStore();

  // Redirect if no active study session is loaded
  useEffect(() => {
    if (!currentSession) {
      toast.error("Please enter study notes first!");
      navigate('/');
    }
  }, [currentSession, navigate]);

  // Telemetry render time calculation via Performance API
  useEffect(() => {
    performance.mark('render-start');
    const measureTimer = setTimeout(() => {
      try {
        performance.mark('render-end');
        performance.measure('client-render-time', 'render-start', 'render-end');
        const measures = performance.getEntriesByName('client-render-time');
        if (measures.length > 0) {
          const duration = measures[0].duration;
          setDevMetrics({ renderTime: Math.max(1, Math.round(duration)) });
        }
      } catch (e) {
        console.warn("Performance API render trace blocked:", e);
      }
    }, 50);

    return () => clearTimeout(measureTimer);
  }, [activeTab, setDevMetrics]);

  // Fullscreen support
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!workspaceRef.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        toast.error("Fullscreen mode blocked by browser");
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Listen to remote PDF export event from Command Palette
  useEffect(() => {
    const handlePdfExport = () => {
      handleExportPDF();
    };
    window.addEventListener('study-export-pdf', handlePdfExport);
    return () => window.removeEventListener('study-export-pdf', handlePdfExport);
  }, [currentSession]);

  const handleExportPDF = () => {
    if (!currentSession) return;
    toast.loading("Compiling study guide PDF...");
    setTimeout(() => {
      toast.dismiss();
      window.print();
    }, 1000);
  };

  // State elements
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const toggleFavorite = (cardFront: string) => {
    setFavorites(prev =>
      prev.includes(cardFront) ? prev.filter(f => f !== cardFront) : [...prev, cardFront]
    );
    toast.success(favorites.includes(cardFront) ? "Removed from favorites" : "Saved to favorites!");
  };

  const toggleBookmark = (cardFront: string) => {
    setBookmarks(prev =>
      prev.includes(cardFront) ? prev.filter(b => b !== cardFront) : [...prev, cardFront]
    );
    toast.success(bookmarks.includes(cardFront) ? "Bookmark cleared" : "Bookmarked!");
  };

  if (!currentSession) return null;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-8 space-y-6" ref={workspaceRef}>

      {/* Workspace Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6 dark:border-slate-900 light:border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-violet-600/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-full uppercase tracking-wider font-bold">
              Level: {currentSession.difficulty}
            </span>
            <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full uppercase tracking-wider font-bold">
              EST. {currentSession.estimated_study_time}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white dark:text-white light:text-slate-900 tracking-tight">{currentSession.title}</h1>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center space-x-2 w-full md:w-auto">

          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-800 rounded-2xl transition dark:bg-slate-900 dark:border-slate-800 light:bg-slate-100 light:border-slate-200 light:text-slate-700"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Workspace Tabs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Navigation Sidebar Pane */}
        <div className="lg:col-span-1 flex flex-col space-y-4">
          <div className="glass-premium p-4 rounded-3xl flex flex-row overflow-x-auto scrollbar-none whitespace-nowrap space-x-2 md:grid md:grid-cols-4 md:space-x-0 md:gap-2 lg:flex lg:flex-col lg:space-y-1.5 lg:whitespace-normal">
            <p className="hidden lg:block text-[9px] font-extrabold uppercase tracking-widest text-slate-500 px-3.5 mb-2">Study Modules</p>

            {/* Module 1: AI Document Chat */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition duration-150 flex-shrink-0 md:justify-center lg:justify-start lg:w-full ${activeTab === 'chat'
                ? 'bg-violet-600 text-white font-bold'
                : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-950 light:text-slate-655 light:hover:bg-slate-50'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{currentSession.isTopic ? 'AI Topic Chat' : 'AI Document Chat'}</span>
            </button>

            {/* Module 2: 3D Recall Flashcards */}
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition duration-150 flex-shrink-0 md:justify-center lg:justify-start lg:w-full ${activeTab === 'flashcards'
                ? 'bg-violet-600 text-white font-bold'
                : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-950 light:text-slate-650 light:hover:bg-slate-50'
                }`}
            >
              <RotateCw className="w-4 h-4" />
              <span>3D Recall Flashcards</span>
            </button>

            {/* Module 3: MCQ Quiz Module */}
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition duration-150 flex-shrink-0 md:justify-center lg:justify-start lg:w-full ${activeTab === 'quiz'
                ? 'bg-violet-600 text-white font-bold'
                : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-950 light:text-slate-650 light:hover:bg-slate-50'
                }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>MCQ Quiz Module</span>
            </button>

            {/* Module 4: Study Route Map */}
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition duration-150 flex-shrink-0 md:justify-center lg:justify-start lg:w-full ${activeTab === 'roadmap'
                ? 'bg-violet-600 text-white font-bold'
                : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-950 light:text-slate-655 light:hover:bg-slate-50'
                }`}
            >
              <GitFork className="w-4 h-4 text-violet-400" />
              <span>Study Route Map</span>
            </button>

            {/* Module 5: Executive Summary */}
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition duration-150 flex-shrink-0 md:justify-center lg:justify-start lg:w-full ${activeTab === 'summary'
                ? 'bg-violet-600 text-white font-bold'
                : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-950 light:text-slate-655 light:hover:bg-slate-50'
                }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Executive Summary</span>
            </button>
          </div>

          {/* Workspace Overview card */}
          <div className="hidden md:block glass p-5 rounded-3xl border border-slate-900 space-y-4 dark:border-slate-900/60 light:bg-white light:border-slate-200">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Workspace Overview</h4>

            <div className="space-y-3">
              {/* Document Name */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Name</span>
                <span
                  className="text-xs font-semibold text-white dark:text-white light:text-slate-800 truncate"
                  title={currentSession.pdfName || (currentSession.isTopic ? 'Topic AI Concept' : 'Pasted Text Document')}
                >
                  {currentSession.pdfName || (currentSession.isTopic ? 'Topic AI Concept' : 'Pasted Text Document')}
                </span>
              </div>

              {/* Total Pages & Difficulty */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pages</span>
                  <span className="text-xs font-semibold text-white dark:text-white light:text-slate-800">
                    {currentSession.pdfPages !== undefined ? currentSession.pdfPages : (currentSession.isTopic ? 'N/A' : 1)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</span>
                  <span className="text-xs font-semibold text-white dark:text-white light:text-slate-800 capitalize">
                    {currentSession.difficulty}
                  </span>
                </div>
              </div>

              {/* AI Ready Status */}
              <div className="flex justify-between items-center py-2 border-y border-slate-950 dark:border-slate-900/50 light:border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Ready Status</span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider text-[8px]">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                  AI Ready
                </span>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-900 dark:bg-slate-950/40">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Flashcards</span>
                  <span className="text-lg font-black text-white dark:text-white light:text-slate-800">
                    {currentSession.flashcards.length}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-900 dark:bg-slate-950/40">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">MCQs</span>
                  <span className="text-lg font-black text-white dark:text-white light:text-slate-800">
                    {currentSession.quiz.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Display workspace */}
        <div className="lg:col-span-3 min-h-[50vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'summary' && (
              <SummaryView
                key="summary-view"
                summary={currentSession.summary}
                tips={currentSession.revision_tips}
              />
            )}

            {activeTab === 'roadmap' && (
              <RoadmapView
                key="roadmap-view"
                roadmap={currentSession.roadmap}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardsView
                key="flashcards-view"
                flashcards={currentSession.flashcards}
                reorderFlashcards={reorderFlashcards}
                favorites={favorites}
                bookmarks={bookmarks}
                toggleFavorite={toggleFavorite}
                toggleBookmark={toggleBookmark}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizView
                key="quiz-view"
                quiz={currentSession.quiz}
              />
            )}

            {activeTab === 'stats' && (
              <StatsView
                key="stats-view"
                session={currentSession}
                favoritesCount={favorites.length}
                bookmarksCount={bookmarks.length}
              />
            )}

            {activeTab === 'chat' && (
              <ChatView
                key="chat-view"
                rawContent={currentSession.rawContent || ''}
                summary={currentSession.summary}
                isTopic={currentSession.isTopic || false}
                chatHistory={currentSession.chatHistory || []}
                saveChatHistory={(msgs) => useStudyStore.getState().saveChatHistory(msgs)}
              />
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

/* ==========================================
 * SUMMARY MODULE SUB-VIEW
 * ========================================== */
const SummaryView: React.FC<{ summary: string; tips: string[] }> = ({ summary, tips }) => {
  const [isReading, setIsReading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const startVoice = () => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech not supported in this browser");
      return;
    }

    // Cancel previous voice
    window.speechSynthesis.cancel();

    const textToRead = `${summary}. Key revision guidelines: ${tips.join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);

    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    synthesisRef.current = utterance;
    setIsReading(true);
    window.speechSynthesis.speak(utterance);
    toast.success("Voice reading started...");
  };

  const stopVoice = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    toast.success("Voice reading stopped.");
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-premium p-6 rounded-3xl space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-950 dark:border-slate-950 light:border-slate-100">
        <h2 className="text-lg font-bold text-white dark:text-white light:text-slate-900 tracking-tight">Executive Summary</h2>

        {isReading ? (
          <button
            onClick={stopVoice}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition duration-150"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Stop Voice</span>
          </button>
        ) : (
          <button
            onClick={startVoice}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition duration-150"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Listen Summary</span>
          </button>
        )}
      </div>

      <div className="relative">
        <div
          className={`text-sm text-slate-350 leading-relaxed font-sans max-w-none prose prose-invert dark:text-slate-350 light:text-slate-655 transition-all duration-300 overflow-hidden ${!isExpanded ? 'max-h-36' : 'max-h-[5000px]'
            }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-extrabold text-white bg-violet-500/15 px-1 rounded" {...props} />
              ),
            }}
          >
            {summary}
          </ReactMarkdown>
        </div>

        {/* Gradient fade when collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0f1e] to-transparent pointer-events-none" />
        )}
      </div>

      <div className="flex justify-start pt-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center space-x-2 text-violet-400 hover:text-violet-300 text-xs font-bold transition focus:outline-none"
        >
          <span>{isExpanded ? 'Collapse Summary' : 'Expand Summary'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-185' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {tips.length > 0 && (
        <div className="pt-6 border-t border-slate-950 dark:border-slate-950 light:border-slate-100 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Key Revision Tips</h3>
          <ul className="space-y-2 text-xs text-slate-400 dark:text-slate-450 light:text-slate-600">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-violet-500 font-extrabold mr-2">•</span>
                <span className="leading-relaxed">
                  <MarkdownMathRenderer content={tip} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

/* ==========================================
 * FLASHCARDS MODULE SUB-VIEW (with Reordering & Flip)
 * ========================================== */
interface FlashcardsProps {
  flashcards: Flashcard[];
  reorderFlashcards: (cards: Flashcard[]) => void;
  favorites: string[];
  bookmarks: string[];
  toggleFavorite: (front: string) => void;
  toggleBookmark: (front: string) => void;
}

const getCardFontSize = (text: string) => {
  const len = text.length;
  if (len < 65) return 'text-base sm:text-lg md:text-xl font-bold';
  if (len < 130) return 'text-sm sm:text-base md:text-lg font-semibold';
  return 'text-xs sm:text-sm md:text-base font-medium';
};

const FlashcardsView: React.FC<FlashcardsProps> = ({
  flashcards,
  reorderFlashcards,
  favorites,
  bookmarks,
  toggleFavorite,
  toggleBookmark
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'bookmarks'>('all');

  // Card focus and flip
  const [activeIdx, setActiveIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Filter flashcards list
  const filteredCards = useMemo(() => {
    return flashcards.filter(c => {
      const matchesSearch = c.front.toLowerCase().includes(search.toLowerCase()) ||
        c.concept.toLowerCase().includes(search.toLowerCase());

      if (filterMode === 'favorites') return matchesSearch && favorites.includes(c.front);
      if (filterMode === 'bookmarks') return matchesSearch && bookmarks.includes(c.front);
      return matchesSearch;
    });
  }, [flashcards, search, filterMode, favorites, bookmarks]);

  const activeCard = filteredCards[activeIdx] || null;

  // Reset active index when list size changes
  useEffect(() => {
    setActiveIdx(0);
    setIsFlipped(false);
  }, [filteredCards.length]);

  // Keyboard navigation within active card
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return; // ignore when typing
      }

      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeIdx < filteredCards.length - 1) {
          setActiveIdx(prev => prev + 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeIdx > 0) {
          setActiveIdx(prev => prev - 1);
          setIsFlipped(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [activeIdx, filteredCards.length]);

  // HTML5 Drag and Drop Handlers for Reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const reordered = [...flashcards];
    const draggedItem = reordered[draggedIdx];
    reordered.splice(draggedIdx, 1);
    reordered.splice(index, 0, draggedItem);

    setDraggedIdx(index);
    reorderFlashcards(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    toast.success("Card order persisted!");
  };

  const speakCard = () => {
    if (!activeCard) return;
    window.speechSynthesis.cancel();
    const text = isFlipped ? activeCard.back : activeCard.front;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <div className="relative w-full sm:flex-grow">
          <Search className="absolute top-3.5 left-4 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search concepts or titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition dark:bg-slate-950 dark:border-slate-900 light:bg-slate-50 light:border-slate-200 light:text-slate-950"
          />
        </div>

        <div className="flex space-x-1.5 w-full sm:w-auto flex-shrink-0">
          {(['all', 'favorites', 'bookmarks'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`flex-1 sm:flex-initial text-[10px] font-bold uppercase tracking-wider px-4 py-3 rounded-2xl border transition duration-150 ${filterMode === mode
                ? 'bg-violet-600 border-violet-500 text-white font-black'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 dark:bg-slate-900 dark:border-slate-800 light:bg-slate-100 light:border-slate-200 light:text-slate-600'
                }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="glass p-12 text-center text-xs font-semibold text-slate-500 border border-slate-900 rounded-3xl dark:border-slate-900 light:bg-white light:border-slate-200">
          No cards matched your filter requirements.
        </div>
      ) : (
        <div className="space-y-6">

          {/* Card Viewer Frame */}
          <div className="flex flex-col items-center justify-center space-y-4">

            {/* 3D Recall Card Shell */}
            <div
              onClick={() => setIsFlipped(prev => !prev)}
              className="w-full max-w-xl aspect-[3/2] min-h-[220px] max-h-[320px] perspective-1000 cursor-pointer"
            >
              <div
                className={`relative w-full h-full duration-300 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''
                  }`}
              >

                {/* Front Side */}
                <div className="absolute inset-0 w-full h-full glass-premium rounded-3xl border border-violet-500/20 p-6 flex flex-col justify-between backface-hidden bg-slate-950/70 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] dark:border-slate-850">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Recall card front • {activeCard.concept}</span>
                    <span className={`px-2 py-0.5 rounded-full ${activeCard.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      activeCard.confidence === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>{activeCard.confidence} difficulty</span>
                  </div>

                  <div className={`text-center px-2 leading-relaxed max-w-md mx-auto whitespace-normal break-words overflow-y-auto max-h-[65%] select-text ${getCardFontSize(activeCard.front)}`}>
                    <MarkdownMathRenderer content={activeCard.front} />
                  </div>

                  <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Click card or press Spacebar to flip
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full glass-premium rounded-3xl border border-violet-500/20 p-6 flex flex-col justify-between backface-hidden rotate-y-180 bg-slate-950/70 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] dark:border-slate-850">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Recall card back • {activeCard.concept}</span>
                    <span>Answer key</span>
                  </div>

                  <div className={`text-center px-2 leading-relaxed max-w-md mx-auto whitespace-normal break-words overflow-y-auto max-h-[65%] select-text ${getCardFontSize(activeCard.back)}`}>
                    <MarkdownMathRenderer content={activeCard.back} />
                  </div>

                  <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Press space to flip back
                  </div>
                </div>

              </div>
            </div>

            {/* In-Card Action HUD */}
            <div className="flex items-center justify-between w-full max-w-xl px-2">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(activeCard.front); }}
                  className={`p-2.5 rounded-xl border transition ${favorites.includes(activeCard.front)
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300 dark:bg-slate-900 dark:border-slate-850'
                    }`}
                  title="Favorite recall card"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(activeCard.front); }}
                  className={`p-2.5 rounded-xl border transition ${bookmarks.includes(activeCard.front)
                    ? 'bg-violet-600/10 border-violet-500/20 text-violet-400'
                    : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300 dark:bg-slate-900 dark:border-slate-850'
                    }`}
                  title="Bookmark card"
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); speakCard(); }}
                  className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-500 hover:text-slate-350 rounded-xl transition dark:bg-slate-900 dark:border-slate-850"
                  title="Voice read card contents"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>

              {/* Navigator HUD */}
              <div className="flex items-center space-x-3">
                <button
                  disabled={activeIdx === 0}
                  onClick={() => { setActiveIdx(prev => prev - 1); setIsFlipped(false); }}
                  className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 disabled:opacity-40 text-slate-400 rounded-xl transition dark:bg-slate-900 dark:border-slate-850"
                  aria-label="Previous card"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-500">
                  {activeIdx + 1} / {filteredCards.length}
                </span>
                <button
                  disabled={activeIdx === filteredCards.length - 1}
                  onClick={() => { setActiveIdx(prev => prev + 1); setIsFlipped(false); }}
                  className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 disabled:opacity-40 text-slate-400 rounded-xl transition dark:bg-slate-900 dark:border-slate-850"
                  aria-label="Next card"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Deck Progress Bar */}
            <div className="w-full max-w-xl bg-slate-900/60 h-1.5 rounded-full overflow-hidden border border-slate-850 dark:border-slate-850">
              <div
                className="bg-violet-600 h-full transition-all duration-300"
                style={{ width: `${((activeIdx + 1) / filteredCards.length) * 100}%` }}
              ></div>
            </div>

          </div>

          {/* Drag & Drop Reordering List */}
          {filterMode === 'all' && (
            <div className="pt-6 border-t border-slate-900 space-y-3 dark:border-slate-900">
              <div className="flex items-center space-x-2 text-slate-500">
                <ListOrdered className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-widest">Drag and Drop Card Reordering (Framer Animations)</h3>
              </div>
              <div className="space-y-2">
                {flashcards.map((card, idx) => (
                  <div
                    key={card.front}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                  >
                    <motion.div
                      layout
                      className={`glass px-4 py-3 rounded-2xl border border-slate-850 flex items-center justify-between text-xs cursor-grab active:cursor-grabbing hover:border-violet-500/20 bg-slate-900/20 transition dark:border-slate-850 light:bg-slate-100 light:border-slate-200 ${draggedIdx === idx ? 'opacity-30 border-violet-500' : ''
                        }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span className="text-[10px] text-slate-550 font-mono">#{idx + 1}</span>
                        <span className="font-semibold text-slate-300 truncate dark:text-slate-300 light:text-slate-800">{card.front}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-550 bg-slate-950 px-2.5 py-1 rounded-lg dark:bg-slate-950 light:bg-white light:border light:border-slate-200">
                        {card.concept}
                      </span>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

/* ==========================================
 * QUIZ MODULE SUB-VIEW
 * ========================================== */
const QuizView: React.FC<{ quiz: MCQ[] }> = ({ quiz }) => {
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Scoring
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Incorrect tracking for retakes
  const [incorrectQuestions, setIncorrectQuestions] = useState<number[]>([]);
  const [retakeMode, setRetakeMode] = useState(false);
  const [activeQuizSet, setActiveQuizSet] = useState<MCQ[]>(quiz);

  const [quizFinished, setQuizFinished] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<number | null>(null);

  const activeQuestion = activeQuizSet[currentIdx] || null;

  // Timer Countdown loop
  useEffect(() => {
    if (!isQuizStarted || isAnswered || quizFinished) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time expired, count as incorrect
          clearInterval(timerRef.current!);
          setSelectedIdx(-1); // special flag for timeout
          setIsAnswered(true);
          const origIdx = quiz.findIndex(q => q.question === activeQuestion.question);
          setIncorrectQuestions(prev => [...prev, origIdx]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isQuizStarted, currentIdx, isAnswered, quizFinished, activeQuizSet]);

  const selectOption = (optIdx: number) => {
    if (isAnswered) return;
    setSelectedIdx(optIdx);
    setIsAnswered(true);

    const isCorrect = optIdx === activeQuestion.correctAnswerIndex;
    if (isCorrect) {
      setQuizScore(s => s + 1);
    } else {
      // Record original index for wrong questions
      const origIdx = quiz.findIndex(q => q.question === activeQuestion.question);
      setIncorrectQuestions(prev => [...prev, origIdx]);
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setSelectedIdx(null);

    if (currentIdx < activeQuizSet.length - 1) {
      setCurrentIdx(idx => idx + 1);
    } else {
      setQuizFinished(true);
      // Trigger confetti if they got a perfect score!
      const totalCorrect = quizScore + (selectedIdx === activeQuestion.correctAnswerIndex ? 1 : 0);
      if (totalCorrect === activeQuizSet.length) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleRetakeIncorrect = () => {
    // Collect the quiz elements that were answered incorrectly
    const wrongSet = quiz.filter((_, idx) => incorrectQuestions.includes(idx));
    setActiveQuizSet(wrongSet);
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setQuizScore(0);
    setIncorrectQuestions([]);
    setRetakeMode(true);
    setQuizFinished(false);
    setIsQuizStarted(true);
  };

  const handleRestartAll = () => {
    setActiveQuizSet(quiz);
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setQuizScore(0);
    setIncorrectQuestions([]);
    setRetakeMode(false);
    setQuizFinished(false);
    setIsQuizStarted(true);
  };

  if (!isQuizStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="glass-premium p-8 rounded-3xl text-center space-y-6 bg-slate-900/40"
      >
        <div className="w-16 h-16 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8 text-violet-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white dark:text-white light:text-slate-900 tracking-tight">Active Recall Assessment</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed dark:text-slate-400 light:text-slate-550">
            A generated {quiz.length}-question MCQ test based on your notes. You have 30 seconds to answer each question.
          </p>
        </div>
        <button
          onClick={() => setIsQuizStarted(true)}
          className="inline-flex items-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl text-xs font-bold tracking-wide transition active:scale-[0.98]"
        >
          <span>Start Assessment</span>
        </button>
      </motion.div>
    );
  }

  if (quizFinished) {
    const accuracy = Math.round((quizScore / activeQuizSet.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-premium p-8 rounded-3xl space-y-6 text-center bg-slate-900/40"
      >
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <Award className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white dark:text-white light:text-slate-900">Quiz Completed!</h2>
          <p className="text-xs text-slate-550">Retake incorrect answers or restart completely.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto text-left pt-2">
          <div className="p-3 bg-slate-950 border border-slate-900 rounded-2xl dark:bg-slate-950 light:bg-slate-50 light:border-slate-100">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Accuracy</span>
            <p className="text-xl font-black text-white dark:text-white light:text-slate-900">{accuracy}%</p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-900 rounded-2xl dark:bg-slate-950 light:bg-slate-50 light:border-slate-100">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Score</span>
            <p className="text-xl font-black text-white dark:text-white light:text-slate-900">
              {quizScore} / {activeQuizSet.length}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-3 max-w-sm mx-auto">
          {incorrectQuestions.length > 0 && (
            <button
              onClick={handleRetakeIncorrect}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
            >
              Retake Incorrect ({incorrectQuestions.length})
            </button>
          )}
          <button
            onClick={handleRestartAll}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
          >
            Restart Full Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-premium p-6 rounded-3xl space-y-6"
    >
      {/* Quiz Progress & Timer */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-950 dark:border-slate-950 light:border-slate-100">
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            {retakeMode ? 'Retake Incorrect Mode' : 'Quiz Question'}
          </span>
          <p className="text-xs font-semibold text-violet-400">
            Question {currentIdx + 1} of {activeQuizSet.length}
          </p>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 font-mono text-xs dark:bg-slate-950 light:bg-slate-50 light:border-slate-200">
          <Timer className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          <span className={timeLeft <= 5 ? 'text-rose-500 font-bold' : ''}>{timeLeft}s</span>
        </div>
      </div>

      {/* Question Text */}
      <div className="font-bold text-white dark:text-white light:text-slate-900 leading-snug">
        <MarkdownMathRenderer content={activeQuestion.question} />
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-3">
        {activeQuestion.options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === activeQuestion.correctAnswerIndex;
          const showAnswerFeedback = isAnswered;

          let btnClass = 'border-slate-850 bg-slate-900/10 text-slate-300 hover:border-slate-800 hover:bg-slate-900/30';
          if (showAnswerFeedback) {
            if (isCorrect) {
              btnClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold';
            } else if (isSelected) {
              btnClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold';
            } else {
              btnClass = 'opacity-40 border-slate-900 text-slate-500 bg-slate-950/20';
            }
          }

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => selectOption(idx)}
              className={`w-full text-left px-5 py-3.5 rounded-2xl border text-xs hover-card-glow transition duration-200 leading-relaxed dark:border-slate-850 light:bg-slate-100 light:border-slate-200 light:text-slate-700 ${btnClass}`}
            >
              <div className="flex items-start text-left">
                <span className="font-mono font-bold mr-3 text-slate-500 mt-0.5 select-none">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="break-words whitespace-normal leading-relaxed">
                  <MarkdownMathRenderer content={option} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Answer Feedback Explanation Accordion */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 bg-slate-950 border border-slate-900 rounded-2xl space-y-2 dark:bg-slate-950 light:bg-slate-50 light:border-slate-100"
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Explanation Context</span>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-650 leading-relaxed">
              <MarkdownMathRenderer content={activeQuestion.explanation} />
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleNext}
                className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition duration-150"
              >
                {currentIdx < activeQuizSet.length - 1 ? 'Next Question' : 'Complete Quiz'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

/* ==========================================
 * STATISTICS MODULE SUB-VIEW
 * ========================================== */
const StatsView: React.FC<{
  session: StudySession;
  favoritesCount: number;
  bookmarksCount: number;
}> = ({ session, favoritesCount, bookmarksCount }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">

        <div className="glass p-5 rounded-3xl border border-slate-900 space-y-1.5 dark:border-slate-900 light:bg-white light:border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cognitive Confidence</span>
          <p className="text-3xl font-black text-white dark:text-white light:text-slate-900">{session.confidence_score}%</p>
          <div className="h-1 bg-slate-950 rounded-full overflow-hidden mt-2 dark:bg-slate-950 light:bg-slate-100">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${session.confidence_score}%` }}
            ></div>
          </div>
        </div>

        <div className="glass p-5 rounded-3xl border border-slate-900 space-y-1.5 dark:border-slate-900 light:bg-white light:border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Bookmarked Items</span>
          <p className="text-3xl font-black text-white dark:text-white light:text-slate-900">{bookmarksCount}</p>
          <p className="text-[10px] text-slate-500 leading-normal">Cards flagged for active revision.</p>
        </div>

        <div className="glass p-5 rounded-3xl border border-slate-900 space-y-1.5 dark:border-slate-900 light:bg-white light:border-slate-200">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Favorited Cards</span>
          <p className="text-3xl font-black text-white dark:text-white light:text-slate-900">{favoritesCount}</p>
          <p className="text-[10px] text-slate-500 leading-normal">Cards marked as favorite concepts.</p>
        </div>

      </div>

      {/* Weak Topics Card */}
      {session.weak_topics && session.weak_topics.length > 0 && (
        <div className="glass p-6 rounded-3xl border border-slate-900 space-y-3 dark:border-slate-900 light:bg-white light:border-slate-200">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Core Areas For Improvement</h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {session.weak_topics.map((topic, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Study Guidance Tips */}
      <div className="glass p-6 rounded-3xl border border-slate-900 space-y-3 dark:border-slate-900 light:bg-white light:border-slate-200">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Revision Guidelines</h3>
        <div className="space-y-4">
          <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl dark:bg-slate-950 light:bg-slate-50 light:border-slate-100">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block mb-1">
              Active Recall Strategy
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-650 leading-relaxed">
              Flip through the flashcards daily. Favorited cards are grouped under the 'favorites' view for concentrated revision.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl dark:bg-slate-950 light:bg-slate-50 light:border-slate-100">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Test-Taking Recall
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-650 leading-relaxed">
              Complete the quiz multiple times. If your score is less than 100%, trigger the 'Retake Incorrect' option to focus exclusively on weaker subjects.
            </p>
          </div>
        </div>
      </div>

    </motion.div>
  );
};

const MarkdownMathRenderer: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) => <span {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-white bg-violet-500/15 px-1 rounded" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
};

const ChatMessageRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ node, ...props }) => (
          <h2 className="text-base font-black text-white mt-4 mb-2 font-sans tracking-wide uppercase" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h3 className="text-sm font-black text-white mt-4 mb-2 font-sans tracking-wide uppercase" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h4 className="text-xs font-black text-white mt-3 mb-1.5 font-sans tracking-wide uppercase" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-xs font-black text-white mt-3 mb-1.5 font-sans tracking-wide uppercase" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p className="leading-relaxed my-1.5 font-sans" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="space-y-1 my-1.5 list-none pl-0" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="space-y-1 my-1.5 list-decimal pl-4 font-sans text-slate-200" {...props} />
        ),
        li: ({ node, ordered, ...props }: any) => {
          if (ordered) {
            return (
              <li className="my-1 font-sans leading-relaxed text-slate-200 list-decimal" {...props} />
            );
          }
          return (
            <li className="flex items-start space-x-2 my-1 pl-2 font-sans">
              <span className="text-violet-400 font-extrabold mt-0.5 select-none">•</span>
              <span className="leading-relaxed">{props.children}</span>
            </li>
          );
        },
        strong: ({ node, ...props }) => (
          <strong className="font-extrabold text-white bg-violet-500/15 px-1 rounded" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const parseBoldText = (text: string) => {
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-extrabold text-white bg-violet-500/15 px-1 rounded">
          {part}
        </strong>
      );
    }
    return part;
  });
};
const renderMath = (text: string) => {
  // Block math: $$...$$
  const blockMatch = text.match(/^\$\$([\s\S]+)\$\$$/);

  if (blockMatch) {
    return <BlockMath math={blockMatch[1]} />;
  }

  // Inline math: $...$
  const parts = text.split(/(\$.*?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return (
        <InlineMath
          key={index}
          math={part.slice(1, -1)}
        />
      );
    }

    return parseBoldText(part);
  });
};
const fixMath = (text: string) => {
  return text
    // Wrap \frac equations
    .replace(
      /([A-Za-z]\s*=\s*\\frac\{[^}]+\}\{[^}]+\}(?:[^\n]*)?)/g,
      "$$$1$$"
    )

    // Wrap equations containing \pi
    .replace(
      /([A-Za-z]\s*=\s*\\pi[^\n]*)/g,
      "$$$1$$"
    )

    // Wrap equations containing \sqrt
    .replace(
      /([A-Za-z]\s*=\s*\\sqrt[^\n]*)/g,
      "$$$1$$"
    );
};

const formatChatMessage = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} className="h-2" />;


    // Check for headings
    // Block equation
    if (
      cleanLine.startsWith("$$") &&
      cleanLine.endsWith("$$")
    ) {
      return (
        <div key={idx} className="my-4 flex justify-center">
          <BlockMath math={cleanLine.slice(2, -2)} />
        </div>
      );
    }

    // Inline equation
    if (
      cleanLine.startsWith("$") &&
      cleanLine.endsWith("$")
    ) {
      return (
        <div key={idx} className="my-2">
          <InlineMath math={cleanLine.slice(1, -1)} />
        </div>
      );
    }
    if (cleanLine.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-xs font-black text-white mt-3 mb-1.5 font-sans tracking-wide uppercase">
          {parseBoldText(cleanLine.substring(4))}
        </h4>
      );
    }
    if (cleanLine.startsWith('## ')) {
      return (
        <h3 key={idx} className="text-sm font-black text-white mt-4 mb-2 font-sans tracking-wide uppercase">
          {parseBoldText(cleanLine.substring(3))}
        </h3>
      );
    }

    // Check for lists
    let isBullet = false;
    if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      isBullet = true;
      cleanLine = cleanLine.substring(2);
    }

    // const content = parseBoldText(cleanLine);
    const content = cleanLine.includes("$$") || cleanLine.includes("$")
      ? renderMath(cleanLine)
      : parseBoldText(cleanLine);

    if (isBullet) {
      return (
        <div key={idx} className="flex items-start space-x-2 my-1 pl-2 font-sans">
          <span className="text-violet-400 font-extrabold mt-0.5 select-none">•</span>
          <span className="leading-relaxed">{content}</span>
        </div>
      );
    }

    return (
      <p key={idx} className="leading-relaxed my-1.5 font-sans">
        {content}
      </p>
    );
  });
};

interface Message {
  role: 'user' | 'model';
  content: string;
}

const RoadmapView: React.FC<{
  roadmap?: {
    nodes: { id: string; label: string; description: string; type: string }[];
    edges: { from: string; to: string }[];
  };
}> = ({ roadmap }) => {
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (roadmap?.nodes && roadmap.nodes.length > 0) {
      setSelectedNodeId(roadmap.nodes[0].id);
    }
  }, [roadmap]);

  if (!roadmap || !roadmap.nodes || roadmap.nodes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-premium p-8 rounded-3xl text-center space-y-4"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-200">No route map found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            This study guide does not have an active route map. Please trigger a new generation to build the learning path.
          </p>
        </div>
      </motion.div>
    );
  }

  const toggleComplete = (id: string) => {
    setCompletedNodes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    toast.success(completedNodes.includes(id) ? "Concept marked as active" : "Concept marked as Mastered!");
  };

  const selectedNode = roadmap.nodes.find(n => n.id === selectedNodeId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="glass-premium p-6 rounded-3xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-900 mb-6 dark:border-slate-850/80">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Interactive Study Route Map</h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Staggered concept roadmap path. Click on nodes to study details.</p>
          </div>
          <div className="text-xs bg-violet-600/15 border border-violet-500/20 text-violet-400 px-3.5 py-1.5 rounded-full font-bold">
            {completedNodes.length} / {roadmap.nodes.length} Mastered
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline flow chart */}
          <div className="lg:col-span-2 relative pl-8 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-violet-600/80 before:via-indigo-500/50 before:to-emerald-500/80 space-y-6">
            {roadmap.nodes.map((node, idx) => {
              const isCompleted = completedNodes.includes(node.id);
              const isSelected = selectedNodeId === node.id;

              let typeBadgeClass = "bg-slate-950 text-slate-450 border border-slate-900";
              if (node.type === 'prerequisite') typeBadgeClass = "bg-blue-500/10 border border-blue-500/20 text-blue-400";
              else if (node.type === 'core') typeBadgeClass = "bg-violet-500/10 border border-violet-500/20 text-violet-400";
              else if (node.type === 'advanced') typeBadgeClass = "bg-amber-500/10 border border-amber-500/20 text-amber-550";
              else if (node.type === 'summary') typeBadgeClass = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";

              return (
                <div key={node.id} className="relative flex items-start group">
                  {/* Glowing Node Button Pin */}
                  <div className="absolute -left-[29px] top-1 z-20">
                    <button
                      onClick={() => toggleComplete(node.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 font-mono text-[9px] font-bold ${isCompleted
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        : isSelected
                          ? "bg-violet-600 border-violet-400 text-white shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                        }`}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </button>
                  </div>

                  {/* Staggered Node Container */}
                  <div
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                      ? "bg-slate-900/50 border-violet-500/40 shadow-lg shadow-violet-600/5"
                      : "bg-slate-950/40 border-slate-900 hover:border-slate-850 hover:bg-slate-900/20"
                      }`}
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${typeBadgeClass}`}>
                        {node.type}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(node.id);
                        }}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition duration-150 ${isCompleted
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-550/20"
                          : "bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-850"
                          }`}
                      >
                        {isCompleted ? "Completed" : "Mark Done"}
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-violet-400 transition-colors">
                      {node.label}
                    </h4>
                    <p className="text-[11px] text-slate-455 leading-relaxed font-sans mt-1 line-clamp-2">
                      <MarkdownMathRenderer content={node.description} className="line-clamp-2 block" />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Node Details Inspection Pane */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div
                  key={selectedNode.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-950/70 border border-slate-900 p-5 rounded-2xl space-y-4 shadow-xl"
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-550">Node Details</span>
                    <h3 className="text-xs font-extrabold text-white leading-snug">{selectedNode.label}</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    <MarkdownMathRenderer content={selectedNode.description} />
                  </p>

                  <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-500 font-sans space-y-2.5">
                    <div className="flex justify-between">
                      <span>Milestone Type:</span>
                      <span className="capitalize font-bold text-slate-350">{selectedNode.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-bold ${completedNodes.includes(selectedNode.id) ? "text-emerald-400" : "text-amber-500"}`}>
                        {completedNodes.includes(selectedNode.id) ? "Concept Mastered" : "Active Focus"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleComplete(selectedNode.id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition duration-150 ${completedNodes.includes(selectedNode.id)
                      ? "bg-slate-900 border border-slate-855 text-slate-400 hover:text-slate-300"
                      : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/10"
                      }`}
                  >
                    {completedNodes.includes(selectedNode.id) ? "Re-study Concept" : "Mark as Mastered"}
                  </button>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-6 border border-dashed border-slate-900 rounded-2xl">
                  <p className="text-xs text-slate-500 font-sans">Select a timeline node to inspect details.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ChatView: React.FC<{
  rawContent: string;
  summary: string;
  isTopic: boolean;
  chatHistory: Message[];
  saveChatHistory: (messages: Message[]) => void;
}> = ({ rawContent, summary, isTopic, chatHistory, saveChatHistory }) => {
  const [messages, setMessages] = useState<Message[]>(chatHistory || []);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (chatHistory) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  const handleSend = async (textToSend?: string) => {
    const questionText = (textToSend || input).trim();
    if (!questionText || isSending) return;

    if (!textToSend) setInput('');

    const newMessages = [...messages, { role: 'user' as const, content: questionText }];
    setMessages(newMessages);
    setIsSending(true);

    try {
      const documentContext = rawContent || summary;
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        documentContext,
        question: questionText,
        history: messages,
        isTopic
      });

      const reply = response.data.answer;
      const updatedMessages = [...newMessages, { role: 'model' as const, content: reply }];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } catch (err: any) {
      let errMsg = "Failed to get reply from AI Study Assistant.";
      if (!err.response) {
        errMsg = "Backend server is unavailable. If it was inactive, Render might be spinning up (takes about 50 seconds). Please try again in a moment.";
      } else if (err.response.data?.error) {
        errMsg = err.response.data.error;
      }
      toast.error(errMsg);
      setMessages(messages);
    } finally {
      setIsSending(false);
    }
  };

  const SUGGESTED_QUESTIONS = isTopic ? [
    { label: "Explain basics", text: "Explain the fundamental concepts of this topic in simple words." },
    { label: "Key milestones", text: "What is the learning path or milestones of this topic?" },
    { label: "Provide examples", text: "Give some practical examples or use cases of this topic." },
    { label: "Self-test questions", text: "Give me some test questions to assess my knowledge of this topic." }
  ] : [
    { label: "Summarize notes", text: "Summarize the document briefly." },
    { label: "Explain simply", text: "Explain the main topic in simple words." },
    { label: "Find key points", text: "Find the most important points in the document." },
    { label: "Generate Interview", text: "Generate interview questions based on the notes." }
  ];
  return (
    <div className="glass-premium p-4 sm:p-6 rounded-3xl flex flex-col h-[88vh] space-y-4">
      {/* Header Info */}
      <div className="border-b border-slate-900 pb-4 flex justify-between items-center dark:border-slate-850/80 light:border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900 tracking-tight">
              {isTopic ? "AI Topic Study Assistant" : "AI Document Chat"}
            </h2>
            <p className="text-[10px] text-slate-555 dark:text-slate-500 font-sans">
              {isTopic
                ? "Interact with the study AI using general topic intelligence"
                : "Ask questions contextually grounded in your uploaded PDF"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-grow overflow-y-auto pr-2 space-y-6 scrollbar-none min-h-0 py-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center px-4 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 border border-violet-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-205 dark:text-slate-200 light:text-slate-900">Ask the Study AI anything</h3>
              <p className="text-xs text-slate-500 max-w-sm font-sans leading-relaxed">
                Unlock active learning! Ask the assistant to clarify complex terms, draft practice questions, or explain formulas step-by-step.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full pt-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.text)}
                  className="px-4 py-3 text-left bg-slate-900/30 hover:bg-slate-900/60 border border-slate-850 hover:border-violet-500/30 rounded-2xl text-xs text-slate-400 hover:text-violet-300 transition duration-150 leading-relaxed font-semibold dark:border-slate-850 light:bg-slate-50 light:border-slate-200 light:text-slate-700 light:hover:bg-slate-100"
                >
                  <span className="font-semibold block text-[10px] text-violet-400 uppercase tracking-wider mb-0.5">{q.label}</span>
                  <span className="line-clamp-1 text-slate-450">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, i) => {
              const isAI = msg.role === 'model';
              return (
                <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'} items-start space-x-3`}>
                  {isAI && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-600/10">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed ${isAI
                    ? 'bg-slate-900/40 border border-slate-850 text-slate-200 dark:bg-slate-900/40 dark:border-slate-850 light:bg-slate-50 light:border-slate-200 light:text-slate-800'
                    : 'bg-violet-600 text-white font-medium shadow-lg shadow-violet-600/10'
                    }`}>
                    {isAI ? <ChatMessageRenderer content={msg.content} /> : msg.content}
                  </div>

                  {!isAI && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 font-bold text-xs text-slate-350 uppercase select-none">
                      U
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-600/10">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-900/40 border border-slate-850 text-slate-400 rounded-2xl p-4 text-xs flex items-center space-x-2 dark:border-slate-850 light:bg-slate-50 light:border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="text-[10px] font-medium text-slate-500 font-sans pl-1.5">Assistant is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Claude/ChatGPT style prompt box */}
      <div className="relative flex flex-col bg-slate-950/60 border border-slate-850 focus-within:border-violet-500/40 rounded-2xl p-3 shadow-inner dark:bg-slate-950/60 dark:border-slate-850 light:bg-slate-50 light:border-slate-200">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isSending}
          placeholder={isTopic ? "Ask a question about this topic... (Enter to send)" : "Ask a question about this document... (Enter to send)"}
          className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none min-h-[44px] max-h-32 font-sans py-1 pr-12 dark:text-slate-100 light:text-slate-900"
        />
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900/60 dark:border-slate-900/30 light:border-slate-200/50">
          <span className="hidden sm:inline-block text-[9px] text-slate-500 font-mono font-medium">Press Enter to send, Shift + Enter for new line</span>
          <button
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
            className="inline-flex items-center justify-center p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-xl transition duration-150 shadow-md shadow-violet-600/10 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Study;
