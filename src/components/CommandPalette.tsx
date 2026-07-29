import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, RefreshCw, Shuffle, HelpCircle, FileDown, SunMoon, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStudyStore } from '../store/studyStore';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string[];
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { 
    currentSession, 
    toggleTheme, 
    toggleDevMode, 
    shuffleFlashcards, 
    setActiveTab, 
    incrementGenerateTrigger 
  } = useStudyStore();

  const commands: CommandItem[] = [
    {
      id: 'new-session',
      title: 'New Study Session',
      subtitle: 'Clear current workspace and prepare input notes',
      icon: Sparkles,
      action: () => {
        navigate('/');
        setTimeout(() => {
          const textarea = document.getElementById('study-notes-textarea');
          textarea?.focus();
        }, 100);
        toast.success("Ready for new session!");
      }
    },
    {
      id: 'generate-again',
      title: 'Generate Again',
      subtitle: 'Re-trigger API generation on the current note input',
      icon: RefreshCw,
      action: () => {
        incrementGenerateTrigger();
        navigate('/');
      }
    },
    {
      id: 'shuffle-flashcards',
      title: 'Shuffle Flashcards',
      subtitle: 'Randomize the order of active recall cards',
      icon: Shuffle,
      action: () => {
        if (!currentSession) {
          toast.error("Generate a study session first!");
          return;
        }
        shuffleFlashcards();
        setActiveTab('flashcards');
        navigate('/study');
        toast.success("Flashcards randomized!");
      }
    },
    {
      id: 'start-quiz',
      title: 'Start Quiz',
      subtitle: 'Switch view directly to the MCQ assessment block',
      icon: HelpCircle,
      action: () => {
        if (!currentSession) {
          toast.error("Generate a study session first!");
          return;
        }
        setActiveTab('quiz');
        navigate('/study');
      }
    },
    {
      id: 'toggle-dev-mode',
      title: 'Toggle Developer Mode',
      subtitle: 'Expose performance latency and JSON repair logs',
      icon: ShieldAlert,
      shortcut: ['Ctrl', 'Shift', 'D'],
      action: () => {
        toggleDevMode();
        toast.success(`Developer Mode ${!useStudyStore.getState().devMode ? 'Enabled' : 'Disabled'}`);
      }
    }
  ];

  // Fuzzy match logic
  const fuzzyMatch = (text: string, searchStr: string): boolean => {
    const cleanText = text.toLowerCase();
    const cleanQuery = searchStr.toLowerCase();
    let queryIdx = 0;
    for (let i = 0; i < cleanText.length && queryIdx < cleanQuery.length; i++) {
      if (cleanText[i] === cleanQuery[queryIdx]) {
        queryIdx++;
      }
    }
    return queryIdx === cleanQuery.length;
  };

  const filteredCommands = commands.filter(cmd => 
    fuzzyMatch(cmd.title, query) || fuzzyMatch(cmd.subtitle, query)
  );

  // Trigger palette keybind
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open / Close with Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      // Hidden Dev Mode trigger: Ctrl + Shift + D
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'D') {
        e.preventDefault();
        toggleDevMode();
        toast.success(`Developer Mode ${useStudyStore.getState().devMode ? 'Enabled' : 'Disabled'}`);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDevMode]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden'; // Lock background scroll
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle keyboard navigation within overlay
  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      // Focus trapping helper
      const listContainer = listRef.current;
      if (listContainer) {
        const focusable = Array.from(listContainer.querySelectorAll('[role="option"]'));
        if (focusable.length > 0) {
          e.preventDefault();
          const nextIdx = e.shiftKey
            ? (selectedIndex - 1 + focusable.length) % focusable.length
            : (selectedIndex + 1) % focusable.length;
          setSelectedIndex(nextIdx);
        }
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listContainer = listRef.current;
    if (listContainer) {
      const activeEl = listContainer.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Keyboard Shortcut floating badge in Navbar or Footer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onKeyDown={handleOverlayKeyDown}
              role="dialog"
              aria-modal="true"
              aria-label="Command Palette"
              className="relative w-[90vw] max-w-sm sm:max-w-lg lg:max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden glass shadow-2xl flex flex-col max-h-[85vh] dark:bg-slate-900/90 dark:border-slate-800 light:bg-white/95 light:border-slate-200 light:shadow-slate-300/40"
            >
              {/* Input Zone */}
              <div className="flex items-center px-4 border-b border-slate-850 dark:border-slate-850 light:border-slate-100 flex-shrink-0">
                <Search className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  className="w-full py-4 bg-transparent border-0 outline-none text-slate-100 text-sm focus:ring-0 placeholder-slate-500 dark:text-slate-100 light:text-slate-900"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Command Palette"
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition dark:hover:bg-slate-800 light:hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Commands List */}
              <div 
                ref={listRef}
                role="listbox" 
                aria-label="Commands"
                className="overflow-y-auto p-2 flex-grow"
              >
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={cmd.id}
                        role="option"
                        aria-selected={isSelected}
                        data-index={idx}
                        onClick={() => {
                          cmd.action();
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer select-none transition-all duration-150 ${
                          isSelected 
                            ? 'bg-violet-600 text-white dark:bg-violet-600 dark:text-white' 
                            : 'text-slate-300 hover:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-850/50 light:text-slate-700 light:hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center min-w-0 mr-4">
                          <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${
                            isSelected ? 'text-white' : 'text-slate-500'
                          }`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate leading-normal">{cmd.title}</p>
                            <p className={`text-xs truncate leading-normal mt-0.5 ${
                              isSelected ? 'text-violet-200' : 'text-slate-500'
                            }`}>{cmd.subtitle}</p>
                          </div>
                        </div>
                        
                        {cmd.shortcut ? (
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {cmd.shortcut.map(key => (
                              <kbd 
                                key={key}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border font-mono ${
                                  isSelected 
                                    ? 'bg-violet-500 border-violet-400 text-white' 
                                    : 'bg-slate-950 border-slate-800 text-slate-500 dark:bg-slate-950 dark:border-slate-800 light:bg-slate-100 light:border-slate-200 light:text-slate-400'
                                }`}
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <kbd className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border font-mono ${
                              isSelected 
                                ? 'bg-violet-500 border-violet-400 text-white' 
                                : 'bg-slate-950/20 border-slate-850/20 text-slate-600 dark:bg-slate-950/20 dark:border-slate-850/20 light:bg-slate-50 light:border-slate-100 light:text-slate-300'
                            }`}>
                              ↵ Enter
                            </kbd>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                    No matching commands found.
                  </div>
                )}
              </div>

              {/* Palette Footer */}
              <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider flex-shrink-0 dark:bg-slate-950/50 dark:border-slate-850 light:bg-slate-50 light:border-slate-100 light:text-slate-400">
                <div className="flex items-center space-x-3">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>Esc Close</span>
                </div>
                <div>
                  Press <kbd className="font-mono text-[9px] border border-slate-800 px-1 py-0.5 rounded">Ctrl + K</kbd> anytime
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
