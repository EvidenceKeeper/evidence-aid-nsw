import { useState, useEffect, useMemo, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/types/chat';

interface EvidenceSuggestion {
  id: string;
  fileName: string;
  relevance: string;
  reason: string;
  exhibit_code?: string;
  type: 'relevant' | 'missing' | 'timeline';
}

interface SmartEvidenceSuggestionsProps {
  recentMessages: ChatMessage[];
  onSelectEvidence: (fileId: string) => void;
}

export const SmartEvidenceSuggestions = memo(({ recentMessages, onSelectEvidence }: SmartEvidenceSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<EvidenceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoize last message content to prevent unnecessary recalculations
  const lastMessageContent = useMemo(() => 
    recentMessages[recentMessages.length - 1]?.content || '',
    [recentMessages]
  );

  // Memoize extracted keywords to avoid recalculation
  const keywords = useMemo(() => 
    extractKeywords(lastMessageContent),
    [lastMessageContent]
  );

  useEffect(() => {
    if (keywords.length > 0) {
      generateSuggestions();
    }
  }, [keywords]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find relevant evidence files
      const { data: files, error } = await supabase
        .from('files')
        .select('id, name, file_summary, exhibit_code, auto_category, created_at')
        .eq('user_id', user.id)
        .eq('status', 'processed')
        .limit(10);

      if (error) throw error;

      // Score and rank evidence
      const scored = files?.map(file => {
        let score = 0;
        let reason = '';
        let type: 'relevant' | 'missing' | 'timeline' = 'relevant';

        // Check keyword matches in file name and summary
        const fileText = `${file.name} ${file.file_summary || ''}`.toLowerCase();
        const matches = keywords.filter(kw => fileText.includes(kw.toLowerCase()));
        
        if (matches.length > 0) {
          score += matches.length * 2;
          reason = `Contains keywords: ${matches.slice(0, 2).join(', ')}`;
        }

        // Check category relevance
        if (file.auto_category) {
          if (lastMessageContent.toLowerCase().includes(file.auto_category.toLowerCase())) {
            score += 3;
            reason = `${file.auto_category} evidence`;
            type = 'relevant';
          }
        }

        // Check recency
        const daysSince = Math.floor((Date.now() - new Date(file.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= 7) {
          score += 1;
          type = 'timeline';
        }

        return {
          id: file.id,
          fileName: file.name,
          relevance: score > 5 ? 'high' : score > 2 ? 'medium' : 'low',
          reason: reason || 'Related to your case',
          exhibit_code: file.exhibit_code,
          score,
          type
        };
      }) || [];

      // Sort by score and take top 3
      const topSuggestions = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setSuggestions(topSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };


  const getIcon = (type: string) => {
    switch (type) {
      case 'relevant': return <TrendingUp className="h-4 w-4" />;
      case 'missing': return <AlertCircle className="h-4 w-4" />;
      case 'timeline': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!suggestions.length || loading) return null;

  return (
    <Card className="p-3 bg-accent/5 border-accent/20" role="region" aria-label="Relevant evidence suggestions">
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Relevant Evidence
        </h4>
        
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id}
              className="flex items-center justify-between p-2 bg-background rounded-lg border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getIcon(suggestion.type)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {suggestion.fileName}
                    </span>
                    {suggestion.exhibit_code && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.exhibit_code}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getRelevanceColor(suggestion.relevance)}`}
                >
                  {suggestion.relevance}
                </Badge>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onSelectEvidence(suggestion.id)}
                  className="h-7"
                  aria-label={`View ${suggestion.fileName}`}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});

SmartEvidenceSuggestions.displayName = 'SmartEvidenceSuggestions';

// Helper function moved outside component for better memoization
const extractKeywords = (text: string): string[] => {
  const keywords = [
    'email', 'message', 'text', 'police', 'report', 'statement',
    'witness', 'evidence', 'photo', 'document', 'record',
    'threat', 'control', 'coercion', 'abuse', 'violence',
    'incident', 'date', 'timeline', 'communication'
  ];

  return keywords.filter(kw => 
    text.toLowerCase().includes(kw)
  );
};
