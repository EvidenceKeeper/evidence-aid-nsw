import React from 'react';
import { Zap, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ResponseMode = 'fast' | 'balanced' | 'detailed';

interface SpeedQualitySelectorProps {
  mode: ResponseMode;
  onModeChange: (mode: ResponseMode) => void;
  className?: string;
}

export function SpeedQualitySelector({ mode, onModeChange, className = "" }: SpeedQualitySelectorProps) {
  const modes = [
    {
      id: 'fast' as ResponseMode,
      label: 'Fast',
      icon: Zap,
      description: 'Quick summaries and direct answers',
      badge: '~10s',
      color: 'text-green-600'
    },
    {
      id: 'balanced' as ResponseMode,
      label: 'Balanced',
      icon: Clock,
      description: 'Good balance of speed and detail',
      badge: '~30s',
      color: 'text-blue-600'
    },
    {
      id: 'detailed' as ResponseMode,
      label: 'Detailed',
      icon: BookOpen,
      description: 'Comprehensive analysis with full context',
      badge: '~60s',
      color: 'text-purple-600'
    }
  ];

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {modes.map((modeOption) => {
          const IconComponent = modeOption.icon;
          const isActive = mode === modeOption.id;
          
          return (
            <Tooltip key={modeOption.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onModeChange(modeOption.id)}
                  className={`gap-1 ${isActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <IconComponent className={`h-3 w-3 ${isActive ? '' : modeOption.color}`} />
                  <span className="hidden md:inline text-xs">{modeOption.label}</span>
                  <Badge 
                    variant={isActive ? "secondary" : "outline"} 
                    className="text-xs px-1 py-0 ml-1"
                  >
                    {modeOption.badge}
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm max-w-xs">
                  <p className="font-medium mb-1">{modeOption.label} Mode</p>
                  <p>{modeOption.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}