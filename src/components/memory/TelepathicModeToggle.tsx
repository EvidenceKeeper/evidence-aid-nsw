import React from 'react';
import { Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTelepathicContext } from './TelepathicContextProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function TelepathicModeToggle() {
  const { telepathicMode, toggleTelepathicMode } = useTelepathicContext();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={telepathicMode ? "default" : "outline"}
            size="sm"
            onClick={toggleTelepathicMode}
            className="gap-2"
          >
            {telepathicMode ? (
              <>
                <Brain className="h-4 w-4" />
                <span className="hidden md:inline">Telepathic</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span className="hidden md:inline">Standard</span>
              </>
            )}
            <Badge 
              variant={telepathicMode ? "secondary" : "outline"} 
              className="text-xs px-1 py-0"
            >
              {telepathicMode ? "ON" : "OFF"}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm max-w-xs">
            <p className="font-medium mb-1">
              {telepathicMode ? "Telepathic Mode Active" : "Standard Mode"}
            </p>
            <p>
              {telepathicMode 
                ? "Enhanced memory, proactive triggers, goal continuity, and smart announcements"
                : "Basic responses without enhanced memory features"
              }
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}