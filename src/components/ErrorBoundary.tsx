import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  private handleCopy = async () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `Error: ${error?.message}\nStack: ${error?.stack}\nComponent Stack: ${errorInfo?.componentStack}`;
    
    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error("Failed to copy error logs to clipboard", err);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-xl w-full glass p-8 rounded-3xl border border-red-500/20 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
            {/* Absolute accent blobs */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Application Crash Intercepted</h1>
                <p className="text-sm text-slate-400 max-w-sm">
                  An unexpected exception halted execution. The details have been isolated to keep user metrics intact.
                </p>
              </div>

              <div className="w-full text-left bg-slate-950 border border-slate-900 rounded-2xl p-4 overflow-x-auto text-[11px] font-mono text-slate-500 max-h-48 leading-relaxed">
                <span className="text-red-400 font-bold block mb-1">
                  CRITICAL: {this.state.error?.name || 'Error'}: {this.state.error?.message}
                </span>
                {this.state.errorInfo?.componentStack || this.state.error?.stack || 'No supplementary diagnostics compiled.'}
              </div>

              <div className="flex flex-col sm:flex-row w-full gap-3 pt-2">
                <button
                  onClick={this.handleReload}
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-2xl text-sm font-semibold tracking-wide shadow-lg shadow-violet-600/20 transition-all duration-150 active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Application</span>
                </button>
                <button
                  onClick={this.handleCopy}
                  className="flex-1 inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 px-5 py-3 rounded-2xl text-sm font-semibold transition active:scale-[0.98]"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied Trace!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Error Details</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
