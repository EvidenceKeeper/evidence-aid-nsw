import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTelepathicContext } from './TelepathicContextProvider';
import { useEnhancedMemory } from '@/hooks/useEnhancedMemory';

interface DetectedPattern {
  id: string;
  type: 'strengthening' | 'concerning' | 'neutral' | 'opportunity';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'high' | 'medium' | 'low';
  sources: string[];
  recommendation?: string;
}

export function PatternRecognitionEngine() {
  const { telepathicMode } = useTelepathicContext();
  const { caseMemory } = useEnhancedMemory();
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);

  useEffect(() => {
    if (telepathicMode && caseMemory) {
      analyzePatterns();
    }
  }, [telepathicMode, caseMemory]);

  const analyzePatterns = () => {
    const detectedPatterns: DetectedPattern[] = [];

    // Case strength trend analysis
    if (caseMemory?.case_strength_score) {
      if (caseMemory.case_strength_score > 0.75) {
        detectedPatterns.push({
          id: 'strong-case',
          type: 'strengthening',
          title: 'Strong Case Foundation',
          description: 'Your evidence consistently supports your legal position',
          confidence: 0.9,
          impact: 'high',
          sources: ['Case analysis', 'Evidence review'],
          recommendation: 'Continue building on this strong foundation'
        });
      } else if (caseMemory.case_strength_score < 0.4) {
        detectedPatterns.push({
          id: 'weak-evidence',
          type: 'concerning',
          title: 'Evidence Gaps Detected',
          description: 'Multiple areas need strengthening to improve case viability',
          confidence: 0.8,
          impact: 'high',
          sources: ['Case analysis'],
          recommendation: 'Focus on gathering supporting documentation'
        });
      }
    }

    // Timeline pattern analysis
    if (caseMemory?.timeline_summary) {
      const hasTimeline = caseMemory.timeline_summary.length > 50;
      if (hasTimeline) {
        detectedPatterns.push({
          id: 'timeline-coherent',
          type: 'strengthening',
          title: 'Coherent Timeline Established',
          description: 'Events follow a logical sequence that supports your narrative',
          confidence: 0.75,
          impact: 'medium',
          sources: ['Timeline analysis'],
        });
      } else {
        detectedPatterns.push({
          id: 'timeline-gaps',
          type: 'opportunity',
          title: 'Timeline Development Opportunity',
          description: 'A more detailed timeline could strengthen your case narrative',
          confidence: 0.6,
          impact: 'medium',
          sources: ['Timeline analysis'],
          recommendation: 'Consider adding more chronological detail'
        });
      }
    }

    // Evidence consistency patterns
    if (caseMemory?.evidence_index) {
      const evidenceCount = Object.keys(caseMemory.evidence_index).length;
      if (evidenceCount >= 3) {
        detectedPatterns.push({
          id: 'evidence-volume',
          type: 'strengthening',
          title: 'Substantial Evidence Base',
          description: `${evidenceCount} pieces of evidence provide multiple support angles`,
          confidence: 0.7,
          impact: 'medium',
          sources: ['Evidence inventory'],
        });
      }
    }

    setPatterns(detectedPatterns.slice(0, 3)); // Show top 3 patterns
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'strengthening': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'concerning': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case 'strengthening': return 'bg-success/10 text-success border-success/20';
      case 'concerning': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'opportunity': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (!telepathicMode || patterns.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Pattern Analysis
          <Badge variant="secondary" className="text-xs">
            {patterns.length} detected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="p-3 rounded-lg bg-card/50 border border-border/50 space-y-2"
          >
            <div className="flex items-start gap-3">
              {getPatternIcon(pattern.type)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{pattern.title}</h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPatternColor(pattern.type)}`}
                  >
                    {pattern.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pattern.description}</p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Confidence: {Math.round(pattern.confidence * 100)}%</span>
                  <span>Impact: {pattern.impact}</span>
                  <span>Sources: {pattern.sources.join(', ')}</span>
                </div>
                
                {pattern.recommendation && (
                  <div className="mt-2 p-2 rounded bg-muted/30 border border-border/30">
                    <p className="text-xs font-medium text-primary">Recommendation:</p>
                    <p className="text-xs text-muted-foreground">{pattern.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}