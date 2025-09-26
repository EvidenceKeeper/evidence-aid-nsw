import { Brain } from 'lucide-react';

interface TypingIndicatorProps {
  message?: string;
}

export function TypingIndicator({ message = "Veronica is thinking..." }: TypingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 p-4 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Brain className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">Veronica</span>
          <span className="text-xs text-muted-foreground">Legal Assistant</span>
        </div>
        
        <div className="bg-muted/50 rounded-2xl rounded-tl-md p-4 max-w-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">{message}</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}