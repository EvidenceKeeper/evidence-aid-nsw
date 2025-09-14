import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Scale, FileText, Gavel } from 'lucide-react';
import { useState } from 'react';

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

interface CitationChipProps {
  citation: Citation;
  mode?: 'user' | 'lawyer';
  onOpen?: () => void;
}

export default function CitationChip({ citation, mode = 'user', onOpen }: CitationChipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getCitationIcon = () => {
    switch (citation.citation_type) {
      case 'statute':
        return <FileText className="h-3 w-3" />;
      case 'case_law':
        return <Gavel className="h-3 w-3" />;
      case 'regulation':
      case 'practice_direction':
      case 'rule':
        return <Scale className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getCitationColor = () => {
    switch (citation.citation_type) {
      case 'statute':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'case_law':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'regulation':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
      case 'practice_direction':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
      case 'rule':
        return 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`inline-flex items-center space-x-1 h-6 px-2 text-xs border rounded-full cursor-pointer transition-colors ${getCitationColor()}`}
          onClick={handleOpen}
        >
          {getCitationIcon()}
          <span className="truncate max-w-24">
            {citation.short_citation}
          </span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="start">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {citation.citation_type.replace('_', ' ').toUpperCase()}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {citation.jurisdiction}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {citation.short_citation}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Full Citation</h4>
              <p className="text-sm">{citation.full_citation}</p>
            </div>

            {citation.neutral_citation && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Neutral Citation</h4>
                <p className="text-sm font-mono">{citation.neutral_citation}</p>
              </div>
            )}

            {citation.court && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Court</h4>
                <p className="text-sm">{citation.court}</p>
              </div>
            )}

            {citation.year && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Year</h4>
                <p className="text-sm">{citation.year}</p>
              </div>
            )}

            {citation.content_preview && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Preview</h4>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  {citation.content_preview}
                </p>
              </div>
            )}

            {mode === 'lawyer' && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confidence: {Math.round(citation.confidence_score * 100)}%</span>
                  {citation.url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => window.open(citation.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Source
                    </Button>
                  )}
                </div>
              </div>
            )}

            {mode === 'user' && citation.url && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={() => window.open(citation.url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Read Full Text
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}