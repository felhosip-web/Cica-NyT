import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logEvent } from '../utils/eventLog';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    const section = this.props.sectionName || 'alkalmazás';
    const componentStack = (errorInfo.componentStack || '').slice(0, 1000);

    logEvent({
      level: 'error',
      category: 'system',
      action: 'system.react_error',
      summary: `Váratlan React felületi hiba (${section}): ${error.message || 'Ismeretlen hiba'}`,
      ok: false,
      errorMessage: error.message,
      details: {
        section,
        name: error.name,
        stack: error.stack?.slice(0, 1000),
        componentStack,
      },
    }).catch(() => {});
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 my-4 bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950 text-white rounded-3xl border border-rose-500/40 shadow-2xl space-y-4 max-w-2xl mx-auto font-sans">
          <div className="flex items-center gap-3 border-b border-rose-800/60 pb-3">
            <div className="w-12 h-12 bg-rose-900/80 rounded-2xl flex items-center justify-center text-2xl border border-rose-700 shrink-0 font-black">
              ⚠️
            </div>
            <div>
              <h3 className="font-extrabold text-base text-rose-100">
                Váratlan hiba történt a felületen
              </h3>
              <p className="text-xs text-rose-200/80">
                {this.props.sectionName
                  ? `Hiba lépett fel a(z) "${this.props.sectionName}" modul megjelenítésekor.`
                  : 'Egy felületi elem hibát észlelt.'}
              </p>
            </div>
          </div>

          <div className="bg-black/50 p-3.5 rounded-2xl border border-rose-900/80 text-xs font-mono space-y-1.5">
            <div className="text-rose-300 font-bold flex items-center justify-between">
              <span>Hibaüzenet:</span>
              <span className="text-[10px] text-gray-400">
                {this.state.error?.name || 'Error'}
              </span>
            </div>
            <p className="text-rose-200 break-words font-medium">
              {this.state.error?.message || 'Ismeretlen felületi hiba.'}
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Az alkalmazás többi része továbbra is működőképes. Újrapróbálhatod a modul betöltését, vagy visszatérhetsz a főoldalra.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Újrapróbálás</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>Főoldal</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
