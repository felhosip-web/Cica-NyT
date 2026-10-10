import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logEvent } from '../utils/eventLog';
import { useAppStore } from '../store/useAppStore';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    logEvent({
      level: 'error',
      category: 'system',
      action: 'system.react_error',
      summary: `React komponens renderelési hiba: ${error?.message || 'Ismeretlen hiba'}`,
      errorMessage: error?.message,
      details: {
        errorName: error?.name,
        errorStack: error?.stack,
        componentStack: errorInfo?.componentStack ? errorInfo.componentStack.slice(0, 1500) : undefined,
      },
      ok: false,
    }).catch(() => {});
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.handleRetry();
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isRootMode = useAppStore.getState().isRootMode;
      const isDev = import.meta.env.DEV;

      return (
        <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-3xl shadow-xl text-rose-950 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-md">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-rose-900">
                {this.props.fallbackTitle || 'Váratlan hiba történt'}
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed font-medium mt-0.5">
                A felület megjelenítése során váratlan hiba keletkezett. Az esemény rögzítésre került az audit naplóban.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-rose-200">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Újrapróbálás</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>Főoldal / Újratöltés</span>
            </button>

            {(isRootMode || isDev) && this.state.error && (
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="px-3 py-2 text-xs font-mono text-rose-800 underline hover:text-rose-950 cursor-pointer ml-auto"
              >
                {this.state.showDetails ? 'Technikai részletek elrejtése ▲' : 'Technikai részletek ▼'}
              </button>
            )}
          </div>

          {this.state.showDetails && (isRootMode || isDev) && (
            <div className="p-3 bg-slate-950 text-rose-300 font-mono text-[11px] rounded-2xl border border-slate-800 space-y-2 overflow-x-auto">
              <div className="font-bold text-rose-400 border-b border-slate-800 pb-1">
                // Hiba részletei (Root / Dev nézet):
              </div>
              <p className="font-extrabold text-rose-200">{this.state.error?.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-snug">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
