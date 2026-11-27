import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render and lazy-load failures in a screen, such as a stale chunk after a deploy.
 * The rest of the app stays mounted, and the user can reload to get the new build.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('Screen failed to load or render', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-stone-700 dark:text-zinc-300">
          Something went wrong loading this screen. Reload to update.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-[#EA581A] text-white text-xs font-medium cursor-pointer"
        >
          Reload
        </button>
      </div>
    );
  }
}
