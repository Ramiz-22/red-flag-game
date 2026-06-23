import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-dark">
          <div className="glass-strong p-8 max-w-md text-center">
            <div className="text-5xl mb-4">😵</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="btn-primary px-6">
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
