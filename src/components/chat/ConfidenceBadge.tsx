import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertCircle, HelpCircle, Shield } from "lucide-react";

interface ConfidenceBadgeProps {
  score?: number;
  verificationStatus?: 'ai_generated' | 'requires_review' | 'lawyer_verified';
}

export function ConfidenceBadge({ score, verificationStatus }: ConfidenceBadgeProps) {
  if (!score && !verificationStatus) return null;

  const getConfidenceDisplay = () => {
    if (verificationStatus === 'lawyer_verified') {
      return {
        icon: <Shield className="w-3 h-3" />,
        label: 'Verified by Lawyer',
        variant: 'default' as const,
        className: 'bg-green-600 text-white border-green-700',
        tooltip: 'This information has been reviewed and verified by a legal professional'
      };
    }

    if (verificationStatus === 'requires_review') {
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'Complex - Review Recommended',
        variant: 'outline' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-300',
        tooltip: 'This matter is complex. We recommend consulting with a lawyer for personalized advice.'
      };
    }

    if (!score) {
      return {
        icon: <HelpCircle className="w-3 h-3" />,
        label: 'AI Generated',
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
        tooltip: 'AI-generated response based on NSW legal information'
      };
    }

    if (score >= 0.8) {
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        label: `High Confidence (${Math.round(score * 100)}%)`,
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-300',
        tooltip: 'High confidence based on clear legal precedents and multiple sources'
      };
    }

    if (score >= 0.6) {
      return {
        icon: <HelpCircle className="w-3 h-3" />,
        label: `Moderate Confidence (${Math.round(score * 100)}%)`,
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 border-blue-300',
        tooltip: 'Moderate confidence - general guidance based on available information'
      };
    }

    return {
      icon: <AlertCircle className="w-3 h-3" />,
      label: `Lower Confidence (${Math.round(score * 100)}%)`,
      variant: 'outline' as const,
      className: 'bg-amber-50 text-amber-700 border-amber-300',
      tooltip: 'Limited information available. Consider consulting a lawyer for your specific situation.'
    };
  };

  const display = getConfidenceDisplay();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={display.variant} className={`flex items-center gap-1 text-xs ${display.className}`}>
            {display.icon}
            {display.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{display.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
