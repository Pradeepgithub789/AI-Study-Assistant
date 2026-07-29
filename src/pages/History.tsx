import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Clock, 
  FileText, 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStudyStore } from '../store/studyStore';

type HistoryTab = 'sessions' | 'telemetry';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const { sessionHistory, requestHistory, setSession, clearHistory } = useStudyStore();
  const [activeTab, setActiveTab] = useState<HistoryTab>('sessions');

  const loadSession = (session: any) => {
    setSession(session);
    toast.success(`Loaded session: ${session.title}`);
    navigate('/study');
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to delete all local session history and API telemetry logs? This cannot be undone.")) {
      clearHistory();
      toast.success("History logs cleared successfully!");
    }
  };

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-10 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6 dark:border-slate-900 light:border-slate-200">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white dark:text-white light:text-slate-900 tracking-tight">Academic History Logs</h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-550">
            Review previous study nodes, parsed document configurations, and API performance telemetry.
          </p>
        </div>
        
        {(sessionHistory.length > 0 || requestHistory.length > 0) && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 rounded-2xl text-xs font-bold transition duration-150"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge Local History</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-950 border border-slate-900 p-1.5 rounded-2xl w-fit dark:bg-slate-950 dark:border-slate-900 light:bg-slate-100 light:border-slate-200">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl transition duration-150 ${
            activeTab === 'sessions' 
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10' 
              : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 light:text-slate-655'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Ingested Sessions ({sessionHistory.length})</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl transition duration-150 ${
            activeTab === 'telemetry' 
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10' 
              : 'text-slate-400 hover:text-slate-200 dark:text-slate-400 light:text-slate-655'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>API Telemetry ({requestHistory.length})</span>
        </motion.button>
      </div>

      {/* Main Display Area */}
      <div className="glass-premium rounded-3xl p-6 bg-slate-900/30 min-h-[40vh] light:bg-white light:shadow-sm">
        <AnimatePresence mode="wait">
          
          {/* SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <motion.div
              key="sessions-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              {sessionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-900 text-slate-600 rounded-2xl dark:bg-slate-950 dark:border-slate-900 light:bg-slate-50 light:border-slate-200">
                    <FileText className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-300 dark:text-slate-350 light:text-slate-900">No session logs found</h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-normal">
                      Ingested study notes and textbook paragraphs are logged here. Paste something in the Dashboard to begin.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sessionHistory.map((session, idx) => (
                    <div
                      key={idx}
                      onClick={() => loadSession(session)}
                      className="p-5 bg-slate-950/40 border border-slate-900 hover-card-glow rounded-2xl flex flex-col justify-between cursor-pointer group dark:bg-slate-950/40 dark:border-slate-900 light:bg-slate-50 light:border-slate-200"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400">
                            {session.difficulty} level
                          </span>
                          <span className="text-[9px] font-mono text-slate-550">
                            {session.estimated_study_time}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition dark:text-white light:text-slate-900 truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {session.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-900/60 dark:border-slate-900/60 light:border-slate-200/80">
                        <div className="flex space-x-1.5">
                          {session.weak_topics?.slice(0, 2).map((topic, i) => (
                            <span 
                              key={i} 
                              className="text-[8px] font-bold uppercase tracking-wide bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-white flex items-center space-x-1 transition dark:text-slate-400 dark:group-hover:text-white light:text-slate-500 light:group-hover:text-slate-900">
                          <span>Enter</span>
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TELEMETRY TAB */}
          {activeTab === 'telemetry' && (
            <motion.div
              key="telemetry-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              {requestHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-900 text-slate-600 rounded-2xl dark:bg-slate-950 light:bg-slate-50">
                    <Terminal className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-300 dark:text-slate-350 light:text-slate-900">No telemetry records</h3>
                    <p className="text-xs text-slate-550 max-w-xs leading-normal">
                      API performance metrics and validation flags are recorded here on execution.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-950/20 divide-y divide-slate-900/50 dark:border-slate-900 light:bg-slate-50 light:border-slate-200 light:divide-slate-200">
                  {requestHistory.map((log, idx) => (
                    <div 
                      key={idx} 
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono text-[10px] text-slate-500 dark:text-slate-550 light:text-slate-655"
                    >
                      <div className="flex flex-wrap items-center gap-2 truncate mr-0 sm:mr-4">
                        {log.status === 'success' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 dark:bg-slate-900 light:bg-white light:border-slate-200">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold text-slate-400 truncate dark:text-slate-400 light:text-slate-850">
                          {log.topic}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto flex-shrink-0 pt-1.5 sm:pt-0 border-t border-slate-900/40 sm:border-t-0 dark:border-slate-900/40 light:border-slate-200/50">
                        <div className="flex items-center space-x-1 text-slate-555">
                          <Clock className="w-3 h-3" />
                          <span>{log.responseTime}ms</span>
                        </div>
                        {log.status === 'success' ? (
                          <span className="px-2 py-0.5 text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-bold uppercase">
                            PASSED
                          </span>
                        ) : (
                          <span 
                            className="px-2 py-0.5 text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md font-bold uppercase"
                            title={log.errorType}
                          >
                            FAIL: {log.errorType}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};

export default History;
