import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Scale, Eye, EyeOff } from 'lucide-react';
import CitationChip from './CitationChip';
import { useCitationContext } from '@/hooks/useCitationContext';

interface Citation {
  id: string;
  citation_type: 'statute' | 'case_law' | 'regulation' | 'practice_direction' | 'rule';
  short_citation: string;
  full_citation: string;
  neutral_citation?: string;
  court?: string;
  year?: number;
  jurisdiction: string;
  url?: string;
  confidence_score: number;
  content_preview?: string;
}

interface ResponseSection {
  content: string;
  type: 'plain' | 'legal_analysis' | 'citation_required';
  citations?: Citation[];
}

interface CitationAwareResponseProps {
  content: string;
  citations?: Citation[];
  userQuery?: string;
  consultationId?: string;
  mode?: 'user' | 'lawyer';
  className?: string;
}

export default function CitationAwareResponse({
  content,
  citations = [],
  userQuery,
  consultationId,
  mode,
  className = '',
}: CitationAwareResponseProps) {
  const { shouldShowCitations, getDisplayMode, detectCitationRequest } = useCitationContext(consultationId);
  const [showLegalMode, setShowLegalMode] = useState(false);
  const [citationsVisible, setCitationsVisible] = useState(false);

  const displayMode = mode || getDisplayMode();
  const shouldShow = shouldShowCitations(userQuery);

  useEffect(() => {
    // Auto-show citations in lawyer mode or when explicitly requested
    if (displayMode === 'lawyer' || detectCitationRequest(userQuery)) {
      setCitationsVisible(true);
    }
  }, [displayMode, userQuery, detectCitationRequest]);

  // Parse content to identify citation-worthy statements
  const parseContentSections = (text: string): ResponseSection[] => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const sections: ResponseSection[] = [];
    
    sentences.forEach((sentence) => {
      const legalIndicators = [
        'according to the law',
        'under section',
        'the act states',
        'case law establishes',
        'court held',
        'legal requirement',
        'statute provides',
        'regulation specifies',
        'precedent shows',
        'legally required',
        'must comply with',
        'law requires',
      ];

      const isLegalStatement = legalIndicators.some(indicator => 
        sentence.toLowerCase().includes(indicator)
      );

      if (isLegalStatement && citations.length > 0) {
        sections.push({
          content: sentence,
          type: 'citation_required',
          citations: citations.slice(0, 2), // Limit citations per statement
        });
      } else {
        sections.push({
          content: sentence,
          type: 'plain',
        });
      }
    });

    return sections;
  };

  const contentSections = parseContentSections(content);

  const renderPlainResponse = () => (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
      
      {(shouldShow || citationsVisible) && citations.length > 0 && (
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Legal References</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCitationsVisible(!citationsVisible)}
              className="h-6 px-2 text-xs"
            >
              {citationsVisible ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {citationsVisible ? 'Hide' : 'Show'} Citations
            </Button>
          </div>
          
          <Collapsible open={citationsVisible} onOpenChange={setCitationsVisible}>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1">
                {citations.map((citation) => (
                  <CitationChip
                    key={citation.id}
                    citation={citation}
                    mode={displayMode}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );

  const renderLawyerResponse = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        {contentSections.map((section, index) => (
          <div key={index} className="space-y-2">
            <p className="text-sm leading-relaxed">{section.content}</p>
            {section.type === 'citation_required' && section.citations && (
              <div className="flex flex-wrap gap-1 ml-4">
                {section.citations.map((citation) => (
                  <CitationChip
                    key={citation.id}
                    citation={citation}
                    mode="lawyer"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {citations.length > 0 && (
        <div className="pt-3 border-t">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                <span className="text-xs font-medium">All Legal Authorities ({citations.length})</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {citations.map((citation) => (
                  <div key={citation.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                    <span className="font-mono">{citation.full_citation}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(citation.confidence_score * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );

  const renderDualModeResponse = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Scale className="h-4 w-4" />
          <span className="text-sm font-medium">Legal Response</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={!showLegalMode ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLegalMode(false)}
            className="h-7 px-3 text-xs"
          >
            Plain English
          </Button>
          <Button
            variant={showLegalMode ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLegalMode(true)}
            className="h-7 px-3 text-xs"
          >
            Legal Mode
          </Button>
        </div>
      </div>

      <Separator />

      {showLegalMode ? renderLawyerResponse() : renderPlainResponse()}
    </div>
  );

  // Determine which response to show
  const getResponseRenderer = () => {
    if (displayMode === 'lawyer') {
      return renderLawyerResponse();
    }
    
    if (citations.length > 0 && (shouldShow || detectCitationRequest(userQuery))) {
      return renderDualModeResponse();
    }
    
    return renderPlainResponse();
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        {getResponseRenderer()}
      </CardContent>
    </Card>
  );
}