import { Component, ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode; name?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; name?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `ErrorBoundary caught an error in ${this.props.name || 'component'}:`,
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='p-4 m-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive'>
          <h2 className='text-lg font-bold mb-2'>
            Something went wrong in {this.props.name || 'component'}
          </h2>
          <p className='font-mono text-xs whitespace-pre-wrap break-all'>
            {this.state.error?.toString()}
          </p>
          <pre className='mt-2 text-xs opacity-75 overflow-auto max-h-40'>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className='mt-4 min-h-11 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
