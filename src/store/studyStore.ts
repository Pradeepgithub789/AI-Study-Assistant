import { create } from 'zustand';
import { StudySession, Flashcard } from '../utils/jsonValidator';

export interface RequestLog {
  timestamp: string;
  topic: string;
  responseTime: number; // in ms
  status: 'success' | 'failure';
  errorType?: string;
}

export interface DevMetrics {
  firstResponseTime: number; // API latency in ms
  parseTime: number;        // JSON repair & validate duration in ms
  renderTime: number;       // Client-side render duration in ms
  requestId: string;
  model: string;
  isValid: boolean;
  isRepaired: boolean;
  errorDetails?: string;
}

export type StudyTab = 'summary' | 'roadmap' | 'flashcards' | 'quiz' | 'stats' | 'chat';

interface StudyState {
  currentSession: StudySession | null;
  sessionHistory: StudySession[];
  requestHistory: RequestLog[];
  studyStreak: number;
  lastActiveDate: string | null;
  theme: 'light' | 'dark';
  devMode: boolean;
  devMetrics: DevMetrics | null;
  activeTab: StudyTab;
  generateTrigger: number; // incremented to trigger generation from Command Palette
  
  // Actions
  setSession: (session: StudySession | null) => void;
  loadSessionHistory: () => void;
  addSessionToHistory: (session: StudySession) => void;
  clearHistory: () => void;
  
  addRequestLog: (log: Omit<RequestLog, 'timestamp'>) => void;
  loadRequestHistory: () => void;
  
  updateStreak: () => void;
  loadStreak: () => void;
  
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  toggleDevMode: () => void;
  setDevMetrics: (metrics: Partial<DevMetrics> | null) => void;
  
  reorderFlashcards: (newCards: Flashcard[]) => void;
  shuffleFlashcards: () => void;
  
  setActiveTab: (tab: StudyTab) => void;
  incrementGenerateTrigger: () => void;
  saveChatHistory: (messages: { role: 'user' | 'model'; content: string }[]) => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentSession: null,
  sessionHistory: [],
  requestHistory: [],
  studyStreak: 0,
  lastActiveDate: null,
  theme: 'dark',
  devMode: false,
  devMetrics: null,
  activeTab: 'chat',
  generateTrigger: 0,

  setSession: (session) => {
    set({ currentSession: session });
    if (session) {
      get().addSessionToHistory(session);
      get().updateStreak();
    }
  },

  loadSessionHistory: () => {
    const data = localStorage.getItem('study_sessions_history');
    if (data) {
      try {
        set({ sessionHistory: JSON.parse(data) });
      } catch (e) {
        console.error("Failed to parse session history", e);
      }
    }
  },

  addSessionToHistory: (session) => {
    const history = get().sessionHistory;
    const filtered = history.filter(s => s.title !== session.title);
    const updated = [session, ...filtered].slice(0, 15);
    localStorage.setItem('study_sessions_history', JSON.stringify(updated));
    set({ sessionHistory: updated });
  },

  clearHistory: () => {
    localStorage.removeItem('study_sessions_history');
    localStorage.removeItem('study_request_logs');
    set({ sessionHistory: [], requestHistory: [] });
  },

  addRequestLog: (log) => {
    const newLog: RequestLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...get().requestHistory].slice(0, 50);
    localStorage.setItem('study_request_logs', JSON.stringify(updated));
    set({ requestHistory: updated });
  },

  loadRequestHistory: () => {
    const data = localStorage.getItem('study_request_logs');
    if (data) {
      try {
        set({ requestHistory: JSON.parse(data) });
      } catch (e) {
        console.error("Failed to parse request logs", e);
      }
    }
  },

  updateStreak: () => {
    const today = new Date().toDateString();
    const lastDate = get().lastActiveDate;
    let streak = get().studyStreak;

    if (lastDate === today) return;

    if (lastDate) {
      const last = new Date(lastDate);
      const diffTime = Math.abs(new Date(today).getTime() - last.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    localStorage.setItem('study_streak', streak.toString());
    localStorage.setItem('study_last_active_date', today);
    set({ studyStreak: streak, lastActiveDate: today });
  },

  loadStreak: () => {
    const streakVal = localStorage.getItem('study_streak');
    const dateVal = localStorage.getItem('study_last_active_date');
    if (streakVal && dateVal) {
      set({ 
        studyStreak: parseInt(streakVal) || 0, 
        lastActiveDate: dateVal 
      });
    }
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  setTheme: (theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('study_theme', theme);
    set({ theme });
  },

  toggleDevMode: () => {
    set(state => ({ devMode: !state.devMode }));
  },

  setDevMetrics: (metrics) => {
    if (metrics === null) {
      set({ devMetrics: null });
    } else {
      set(state => ({
        devMetrics: state.devMetrics ? { ...state.devMetrics, ...metrics } as DevMetrics : metrics as DevMetrics
      }));
    }
  },

  reorderFlashcards: (newCards) => {
    const current = get().currentSession;
    if (!current) return;
    const updatedSession = { ...current, flashcards: newCards };
    set({ currentSession: updatedSession });
    
    const history = get().sessionHistory;
    const updatedHistory = history.map(s => s.title === current.title ? updatedSession : s);
    localStorage.setItem('study_sessions_history', JSON.stringify(updatedHistory));
    set({ sessionHistory: updatedHistory });
  },

  shuffleFlashcards: () => {
    const current = get().currentSession;
    if (!current || !current.flashcards.length) return;
    
    // Shuffle helper (Fisher-Yates)
    const cards = [...current.flashcards];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    get().reorderFlashcards(cards);
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  incrementGenerateTrigger: () => {
    set(state => ({ generateTrigger: state.generateTrigger + 1 }));
  },

  saveChatHistory: (messages) => {
    const current = get().currentSession;
    if (!current) return;
    const updatedSession = { ...current, chatHistory: messages };
    set({ currentSession: updatedSession });
    
    const history = get().sessionHistory;
    const updatedHistory = history.map(s => s.title === current.title ? updatedSession : s);
    localStorage.setItem('study_sessions_history', JSON.stringify(updatedHistory));
    set({ sessionHistory: updatedHistory });
  }
}));
