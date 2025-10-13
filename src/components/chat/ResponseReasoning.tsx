import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Lightbulb, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SourceReference {
  type: 'statute' | 'case_law' | 'regulation' | 'practice_direction' | 'rule';
  citation: string;
  url?: string;
  section?: string;
}

interface ResponseReasoningProps {
  reasoning?: string;
  sourceReferences?: SourceReference[];
}

export function ResponseReasoning({ reasoning, sourceReferences }: ResponseReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reasoning && (!sourceReferences || sourceReferences.length === 0)) return null;

  const getSourceTypeColor = (type: string) => {
    const colors = {
      statute: 'bg-blue-100 text-blue-800 border-blue-300',
      case_law: 'bg-purple-100 text-purple-800 border-purple-300',
      regulation: 'bg-green-100 text-green-800 border-green-300',
      practice_direction: 'bg-orange-100 text-orange-800 border-orange-300',
      rule: 'bg-pink-100 text-pink-800 border-pink-300'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSourceTypeLabel = (type: string) => {
    const labels = {
      statute: 'Act/Statute',
      case_law: 'Case Law',
      regulation: 'Regulation',
      practice_direction: 'Practice Direction',
      rule: 'Court Rule'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-2 w-full justify-between text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="w-3 h-3" />
          Why I suggest this
        </span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {isExpanded && (
        <Card className="mt-2 bg-muted/30">
          <CardContent className="p-3 space-y-3">
            {reasoning && (
              <div>
                <p className="text-xs font-medium mb-1">Reasoning:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
              </div>
            )}

            {sourceReferences && sourceReferences.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Legal Sources Referenced:</p>
                <div className="space-y-2">
                  {sourceReferences.map((source, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <Badge 
                        variant="outline" 
                        className={`${getSourceTypeColor(source.type)} flex-shrink-0`}
                      >
                        {getSourceTypeLabel(source.type)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium break-words">
                          {source.citation}
                          {source.section && <span className="text-muted-foreground ml-1">({source.section})</span>}
                        </p>
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 mt-0.5"
                          >
                            View source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
