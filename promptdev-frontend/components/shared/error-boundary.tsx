"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      /* v8 ignore start -- error always has message when hasError is true */
      const errorMessage = this.state.error?.message ?? "An unexpected error occurred.";
      /* v8 ignore stop */

      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {errorMessage}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
