/**
 * ErrorBoundary — Display Engineering: Auto-Recovery
 * 
 * For unattended wall displays, crashes must be invisible to viewers.
 * This boundary catches React errors and automatically reloads with
 * exponential backoff (5s → 10s → 20s → 40s → 60s max).
 * 
 * After 5 consecutive failures, shows a minimal diagnostic screen
 * that an operator can see (with the triple-tap corner hint).
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  retryCount: number;
  nextRetryIn: number;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorStack: '',
      retryCount: 0,
      nextRetryIn: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: error.message, errorStack: error.stack || '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
    
    const maxRetries = this.props.maxRetries ?? 5;
    const retryCount = this.state.retryCount + 1;
    
    if (retryCount <= maxRetries) {
      // Exponential backoff: 5s, 10s, 20s, 40s, 60s
      const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
      const delaySeconds = Math.ceil(delay / 1000);
      
      this.setState({ retryCount, nextRetryIn: delaySeconds });
      
      // Countdown
      this.countdownTimer = setInterval(() => {
        this.setState(prev => ({
          nextRetryIn: Math.max(0, prev.nextRetryIn - 1),
        }));
      }, 1000);
      
      // Auto-reload
      this.retryTimer = setTimeout(() => {
        window.location.reload();
      }, delay);
    } else {
      this.setState({ retryCount });
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  render() {
    const maxRetries = this.props.maxRetries ?? 5;

    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#050d18] flex items-center justify-center z-[10000]">
          <div className="text-center max-w-md">
            {/* Subtle animated indicator */}
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-amber-500 animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-xl text-white/80 font-mono mb-2">
              Display Recovery
            </h2>
            
            {this.state.retryCount <= maxRetries ? (
              <>
                <p className="text-gray-500 text-sm font-mono mb-4">
                  Auto-recovering in {this.state.nextRetryIn}s
                </p>
                <div className="w-48 h-1 bg-gray-800 rounded-full mx-auto overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (1 - this.state.nextRetryIn / 60) * 100)}%` }}
                  />
                </div>
                <p className="text-gray-600 text-xs font-mono mt-4">
                  Attempt {this.state.retryCount}/{maxRetries}
                </p>
              </>
            ) : (
              <>
                <p className="text-red-400/70 text-sm font-mono mb-4">
                  Recovery failed after {maxRetries} attempts
                </p>
                <div className="p-3 bg-gray-900/50 rounded-lg mb-4 max-h-32 overflow-auto">
                  <pre className="text-gray-600 text-xs font-mono text-left whitespace-pre-wrap">
                    {this.state.errorStack || this.state.errorMessage}
                  </pre>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-amber-600 text-white rounded font-mono text-sm hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  Manual Reload
                </button>
                <p className="text-gray-700 text-xs font-mono mt-6">
                  Triple-tap corner for operator panel
                </p>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
