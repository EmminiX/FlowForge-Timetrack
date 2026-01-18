import { Component, ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; name?: string }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode; name?: string }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`ErrorBoundary caught an error in ${this.props.name || 'component'}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
                    <h2 className="text-lg font-bold mb-2">Something went wrong in {this.props.name || 'component'}</h2>
                    <p className="font-mono text-xs whitespace-pre-wrap break-all">
                        {this.state.error?.toString()}
                    </p>
                    <pre className="mt-2 text-xs opacity-75 overflow-auto max-h-40">
                        {this.state.error?.stack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
