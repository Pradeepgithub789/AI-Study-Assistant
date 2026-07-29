import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import Navbar from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { InteractiveBackground } from './components/InteractiveBackground';
import ErrorBoundary from './components/ErrorBoundary';
import { useStudyStore } from './store/studyStore';

// Lazy loading heavy study routes
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Study = React.lazy(() => import('./pages/Study'));
const History = React.lazy(() => import('./pages/History'));

// Page loading fallback shimmer
const PageFallback: React.FC = () => (
  <div className="flex-grow flex items-center justify-center min-h-[60vh] bg-slate-950 text-slate-400">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
      <p className="text-sm font-semibold tracking-wider text-violet-400">Loading modules...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { setTheme, loadSessionHistory, loadRequestHistory, loadStreak } = useStudyStore();

  // Load local state configurations on initial mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('study_theme') as 'light' | 'dark' | null;
    setTheme(savedTheme || 'dark');
    loadSessionHistory();
    loadRequestHistory();
    loadStreak();
  }, [setTheme, loadSessionHistory, loadRequestHistory, loadStreak]);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans select-none antialiased transition-colors duration-200 dark:text-slate-100 light:text-slate-900 w-full max-w-none pb-safe relative">
      {/* Interactive Node Graph Live Background & Cyber-Grid */}
      <InteractiveBackground />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-5] select-none opacity-60 dark:opacity-60 light:opacity-25 transition-opacity duration-300">
        <div className="absolute inset-0 bg-grid-pattern"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.06),rgba(255,255,255,0))]"></div>
      </div>

      {/* Keyboard Accessibility Skip to Content Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-violet-600 focus:text-white focus:rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 font-bold"
      >
        Skip to Content
      </a>

      <Navbar />
      <CommandPalette />
      
      <main id="main-content" className="flex-grow pt-24 md:pt-28">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/study" element={<Study />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      
      <footer className="py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] border-t border-slate-900/80 bg-slate-950/40 backdrop-blur-md text-slate-400 dark:bg-slate-950/40 dark:border-slate-900/80 light:bg-slate-50/40 light:border-slate-200/80 flex-shrink-0 relative z-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="font-extrabold text-sm tracking-tight text-white dark:text-white light:text-slate-900">
              Study<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-semibold">AI</span>
            </span>
            <p className="text-xs text-slate-500 font-medium max-w-sm">AI-powered learning platform built for smarter studying.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-end gap-3 text-[10px] text-slate-500 font-medium tracking-wide text-center md:text-right font-sans">
            <span>© 2026 StudyAI. All rights reserved.</span>
            <span className="hidden md:inline text-slate-700">•</span>
            <span>Built with React, Tailwind CSS and Google Gemini.</span>
          </div>
        </div>
      </footer>

      {/* Global Toast Notification System */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          className: 'glass text-slate-100 border border-slate-800 text-sm font-semibold rounded-2xl p-4 bg-slate-950/90',
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <MotionConfig reducedMotion="user">
          <AppContent />
        </MotionConfig>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
