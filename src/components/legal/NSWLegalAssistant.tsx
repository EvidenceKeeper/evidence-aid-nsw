import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Scale, 
  MessageSquare, 
  Zap, 
  Star, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import CitationAwareResponse from './CitationAwareResponse';
import { useCitationContext } from '@/hooks/useCitationContext';

interface RAGResponse {
  answer: string;
  citations: any[];
  evidence_connections: any[];
  confidence_score: number;
  source_freshness: number;
  citation_hit_rate: number;
  mode: 'user' | 'lawyer';
}

export default function NSWLegalAssistant() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [citationMode, setCitationMode] = useState(false);
  const { getDisplayMode, detectCitationRequest } = useCitationContext();
  const { toast } = useToast();

  const handleQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a legal question.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const mode = getDisplayMode();
      const shouldShowCitations = citationMode || detectCitationRequest(query);

      const { data, error } = await supabase.functions.invoke('nsw-rag-assistant', {
        body: {
          query: query.trim(),
          includeEvidence,
          mode,
          jurisdiction: 'NSW',
          maxResults: 10,
          citationMode: shouldShowCitations
        }
      });

      if (error) throw error;

      setResponse(data);
      
      if (data.confidence_score < 0.6) {
        toast({
          title: "Low Confidence Response",
          description: "The system has limited information for this query. Consider consulting a lawyer.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('NSW RAG Assistant error:', error);
      toast({
        title: "Error",
        description: "Failed to process your legal question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getQualityIndicator = (score: number) => {
    if (score >= 0.8) return { icon: CheckCircle, color: 'text-green-600', label: 'High Quality' };
    if (score >= 0.6) return { icon: Star, color: 'text-yellow-600', label: 'Good Quality' };
    return { icon: AlertTriangle, color: 'text-red-600', label: 'Low Quality' };
  };

  const qualityIndicator = response ? getQualityIndicator(response.confidence_score) : null;

  // Sample questions for different NSW legal topics
  const sampleQuestions = [
    {
      category: "AVO/Domestic Violence",
      questions: [
        "What are the grounds for obtaining an AVO in NSW and what happens at the first mention?",
        "How does coercive control differ from physical domestic violence in NSW law?",
        "What evidence do I need to support an AVO application?"
      ]
    },
    {
      category: "Family Law",
      questions: [
        "What factors must the court consider when making parenting orders under the Family Law Act?",
        "How do I apply for urgent recovery orders if my child has been taken?",
        "What is the difference between consent orders and a parenting plan?"
      ]
    },
    {
      category: "Court Process",
      questions: [
        "What happens at a first mention for family law matters in NSW?",
        "How do I serve court documents in NSW family law proceedings?",
        "What are the timeframes for filing a response to family law proceedings?"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scale className="h-5 w-5" />
            <span>NSW Legal Assistant</span>
          </CardTitle>
          <CardDescription>
            Get NSW-specific legal guidance with citation-grounded responses and evidence integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about NSW law, court procedures, or legal requirements..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                className="flex-1"
              />
              <Button onClick={handleQuery} disabled={loading}>
                {loading ? 'Processing...' : 'Ask'}
              </Button>
            </div>

            {/* Settings */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="evidence-toggle"
                  checked={includeEvidence}
                  onCheckedChange={setIncludeEvidence}
                />
                <Label htmlFor="evidence-toggle" className="text-sm">
                  <Zap className="h-3 w-3 inline mr-1" />
                  Use my evidence
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="citation-toggle"
                  checked={citationMode}
                  onCheckedChange={setCitationMode}
                />
                <Label htmlFor="citation-toggle" className="text-sm">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Show legal citations
                </Label>
              </div>
            </div>
          </div>

          {/* Sample Questions */}
          {!response && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Try asking about:</h4>
              <div className="space-y-2">
                {sampleQuestions.map((category, idx) => (
                  <div key={idx} className="space-y-1">
                    <Badge variant="outline" className="text-xs">
                      {category.category}
                    </Badge>
                    <div className="grid gap-1">
                      {category.questions.map((question, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => setQuery(question)}
                          className="text-left text-xs text-muted-foreground hover:text-foreground p-2 rounded border border-dashed border-muted hover:border-border transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response */}
      {response && (
        <div className="space-y-4">
          {/* Quality Metrics */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {qualityIndicator && (
                    <div className="flex items-center space-x-2">
                      <qualityIndicator.icon className={`h-4 w-4 ${qualityIndicator.color}`} />
                      <span className="text-sm font-medium">{qualityIndicator.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(response.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{Math.round(response.citation_hit_rate * 100)}% cited</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{Math.round(response.source_freshness)} days old</span>
                  </div>
                  {response.evidence_connections.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3" />
                      <span>{response.evidence_connections.length} evidence links</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Response */}
          <CitationAwareResponse
            content={response.answer}
            citations={response.citations}
            userQuery={query}
            mode={response.mode}
          />

          {/* Evidence Connections */}
          {response.evidence_connections.length > 0 && (
            <Card className="border border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span>Your Evidence Connections</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {response.evidence_connections.map((connection, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800">{connection.file_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(connection.evidence_relevance * 100)}% relevant
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700">
                        {connection.connection_explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setQuery('');
                setResponse(null);
              }}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Ask Another Question
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}