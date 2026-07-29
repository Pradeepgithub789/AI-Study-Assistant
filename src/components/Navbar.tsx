import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, GraduationCap, History, Flame, Terminal, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useStudyStore } from '../store/studyStore';

export const Navbar: React.FC = () => {
  const { toggleTheme, studyStreak, currentSession, devMode } = useStudyStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 px-4 sm:px-6 ${
      isScrolled 
        ? 'py-3 bg-slate-950/75 border-b border-violet-500/15 backdrop-blur-xl shadow-lg shadow-violet-950/5' 
        : 'py-5 bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-[1920px] mx-auto w-full flex flex-col">
        <div className="flex items-center justify-between w-full">
          
          {/* Branding Logo */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link 
              to="/" 
              className="flex items-center space-x-2.5 text-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:rounded-lg p-1 min-h-[44px]"
              aria-label="StudyAI Home"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <motion.div 
                whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                className="p-2 bg-violet-600/10 rounded-xl border border-violet-500/20 shadow-inner flex items-center justify-center"
              >
                <BookOpen className="w-5 h-5 text-violet-500" />
              </motion.div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Study<span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent font-black drop-shadow-[0_0_12px_rgba(139,92,246,0.35)]">AI</span>
              </span>
            </Link>
          </motion.div>

          {/* Center Nav Links - Desktop */}
          <div className="hidden md:flex items-center space-x-1 border border-slate-850 bg-slate-900/40 p-1.5 rounded-2xl dark:border-slate-850">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative">
              <NavLink 
                to="/" 
                end
                className={({ isActive }) => 
                  `relative flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl transition duration-155 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isActive 
                      ? 'text-white shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavBackground"
                        className="absolute inset-0 bg-violet-600 rounded-xl -z-10 shadow-md shadow-violet-600/15 border border-violet-500/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <LayoutDashboard className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Dashboard</span>
                  </>
                )}
              </NavLink>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative">
              <NavLink 
                to="/study" 
                className={({ isActive }) => 
                  `relative flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl transition duration-155 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isActive 
                      ? 'text-white shadow-inner' 
                      : !currentSession
                        ? 'text-slate-500 cursor-not-allowed opacity-60'
                        : 'text-slate-400 hover:text-slate-200'
                  }`
                }
                onClick={(e) => {
                  if (!currentSession) {
                    e.preventDefault();
                    toast.error("Generate a study session first!");
                  }
                }}
                aria-disabled={!currentSession}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavBackground"
                        className="absolute inset-0 bg-violet-600 rounded-xl -z-10 shadow-md shadow-violet-600/15 border border-violet-500/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <GraduationCap className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">AI Workspace</span>
                  </>
                )}
              </NavLink>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative">
              <NavLink 
                to="/history" 
                className={({ isActive }) => 
                  `relative flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl transition duration-155 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isActive 
                      ? 'text-white shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavBackground"
                        className="absolute inset-0 bg-violet-600 rounded-xl -z-10 shadow-md shadow-violet-600/15 border border-violet-500/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <History className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">History Log</span>
                  </>
                )}
              </NavLink>
            </motion.div>
          </div>

          {/* Right Nav Utilities */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Developer Mode Active Badge */}
            {devMode && (
              <div 
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-xl animate-pulse"
                title="Developer Telemetry Mode Active"
              >
                <Terminal className="w-3 h-3" />
                <span className="hidden sm:inline">Dev Active</span>
              </div>
            )}

            {/* Study Streak Counter */}
            {studyStreak > 0 && (
              <div 
                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 dark:bg-amber-500/10 dark:border-amber-500/20 light:bg-amber-50 light:border-amber-100"
                title={`Study Streak: ${studyStreak} day(s)`}
              >
                <Flame className="w-4 h-4 fill-amber-500 animate-bounce" />
                <span className="text-xs font-bold">{studyStreak}d</span>
              </div>
            )}




            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800 rounded-xl transition duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:bg-slate-900/60 dark:border-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-3 pt-3 border-t border-slate-850 dark:border-slate-850/80 light:border-slate-100 flex flex-col space-y-1.5 overflow-hidden"
            >
              <NavLink 
                to="/" 
                end
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center space-x-3 text-xs font-semibold px-4 py-3 rounded-xl transition duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/15' 
                      : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-500 light:hover:text-slate-950'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
              
              <NavLink 
                to="/study" 
                onClick={(e) => {
                  if (!currentSession) {
                    e.preventDefault();
                    toast.error("Generate a study session first!");
                  } else {
                    setIsMobileMenuOpen(false);
                  }
                }}
                className={({ isActive }) => 
                  `flex items-center space-x-3 text-xs font-semibold px-4 py-3 rounded-xl transition duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/15' 
                      : !currentSession
                        ? 'text-slate-500 cursor-not-allowed opacity-50 dark:text-slate-650'
                        : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-500 light:hover:text-slate-950'
                  }`
                }
                aria-disabled={!currentSession}
              >
                <GraduationCap className="w-4 h-4" />
                <span>AI Workspace</span>
              </NavLink>
              
              <NavLink 
                to="/history" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center space-x-3 text-xs font-semibold px-4 py-3 rounded-xl transition duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/15' 
                      : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 dark:hover:text-slate-200 light:text-slate-500 light:hover:text-slate-950'
                  }`
                }
              >
                <History className="w-4 h-4" />
                <span>History Log</span>
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
