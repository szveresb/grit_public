import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FShieldAlert, FLoader } from '@/components/icons/FreudIcons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInternal extends Component<Props & { t: any }, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.name || 'Global'}]:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { t } = this.props;
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="surface-card max-w-md w-full p-8 space-y-6 border-destructive/20 bg-destructive/5">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <FShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {t?.errors?.componentCrashTitle || 'Something went wrong'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t?.errors?.componentCrashDesc || 'An unexpected error occurred while rendering this section. Our team has been notified.'}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-background/50 p-4 rounded-2xl overflow-auto max-h-32 border border-border/50">
                <code className="text-[10px] text-destructive font-mono whitespace-pre">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <Button 
              onClick={this.handleReset}
              variant="outline"
              className="rounded-full w-full"
            >
              <FLoader className="w-4 h-4 mr-2" />
              {t?.errors?.retry || 'Try Again'}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** 
 * Wraps the internal class component to inject the useLanguage hook 
 * and provide a clean functional API.
 */
export const ErrorBoundary = (props: Props) => {
  const { t } = useLanguage();
  return <ErrorBoundaryInternal {...props} t={t} />;
};

export default ErrorBoundary;
