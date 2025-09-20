import React from 'react';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HallucinationGuardProps {
  confidence: number;
  sources: number;
  onRequestClarification?: () => void;
  className?: string;
}

export function HallucinationGuard({ 
  confidence, 
  sources, 
  onRequestClarification,
  className = "" 
}: HallucinationGuardProps) {
  const getConfidenceLevel = () => {
    if (confidence >= 0.8) return { level: 'high', color: 'bg-green-500', icon: CheckCircle };
    if (confidence >= 0.6) return { level: 'medium', color: 'bg-yellow-500', icon: HelpCircle };
    return { level: 'low', color: 'bg-red-500', icon: AlertTriangle };
  };

  const confidenceInfo = getConfidenceLevel();
  const IconComponent = confidenceInfo.icon;

  if (confidence >= 0.8) return null;

  return (
    <Card className={`p-3 border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20 ${className}`}>
      <div className="flex items-center gap-3">
        <IconComponent className="h-4 w-4 text-orange-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Confidence Check
            </span>
            <Badge variant="outline" className="text-xs">
              {Math.round(confidence * 100)}%
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sources} sources
            </Badge>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300">
            {confidence < 0.6 
              ? "Low confidence - this response may contain assumptions. Please verify with official sources."
              : "Medium confidence - consider requesting clarification for critical decisions."
            }
          </p>
        </div>
        {onRequestClarification && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRequestClarification}
            className="text-xs"
          >
            Clarify
          </Button>
        )}
      </div>
    </Card>
  );
}