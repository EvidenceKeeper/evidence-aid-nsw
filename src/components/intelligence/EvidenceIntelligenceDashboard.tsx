import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  FileSearch,
  Zap,
  BarChart3,
  Eye,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface CaseIntelligence {
  overall_case_strength: number;
  evidence_completeness: number;
  pattern_coherence: number;
  timeline_clarity: number;
  legal_foundation_strength: number;
  key_strengths: unknown;
  critical_weaknesses: unknown;
  evidence_gaps: unknown;
  strategic_priorities: unknown;
  next_steps: unknown;
  risk_factors: unknown;
}

interface EvidenceAnalysis {
  file_id: string;
  confidence_score: number;
  legal_strength: number;
  case_impact: string;
  key_insights: unknown;
  strategic_recommendations: unknown;
  evidence_gaps_identified: unknown;
  synthesis: unknown;
}

interface TimelineEvent {
  event_date: string;
  title: string;
  description: string;
  category: string;
  legal_significance: string;
  confidence: number;
  evidence_type: string;
}

interface CasePattern {
  pattern_type: string;
  description: string;
  pattern_strength: number;
  legal_significance: string;
  escalation_indicator: boolean;
  corroboration_status: string;
  timeline_start?: string;
  timeline_end?: string;
}

export default function EvidenceIntelligenceDashboard() {
  const [caseIntelligence, setCaseIntelligence] = useState<CaseIntelligence | null>(null);
  const [evidenceAnalyses, setEvidenceAnalyses] = useState<EvidenceAnalysis[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [casePatterns, setCasePatterns] = useState<CasePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  const loadIntelligenceData = async () => {
    try {
      // Load case intelligence synthesis
      const { data: intelligence } = await supabase
        .from('case_intelligence_synthesis')
        .select('*')
        .single();

      setCaseIntelligence(intelligence);

      // Load evidence analyses
      const { data: analyses } = await supabase
        .from('evidence_comprehensive_analysis')
        .select('*')
        .order('legal_strength', { ascending: false });

      setEvidenceAnalyses(analyses || []);

      // Load enhanced timeline events
      const { data: events } = await supabase
        .from('enhanced_timeline_events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(20);

      setTimelineEvents(events || []);

      // Load case patterns
      const { data: patterns } = await supabase
        .from('case_patterns')
        .select('*')
        .order('pattern_strength', { ascending: false });

      setCasePatterns(patterns || []);

    } catch (error) {
      console.error('Error loading intelligence data:', error);
      toast({
        title: "Error",
        description: "Failed to load intelligence dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerIntelligenceAnalysis = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('evidence-intelligence-orchestrator', {
        body: { trigger_type: 'manual_comprehensive' }
      });

      if (error) throw error;

      toast({
        title: "Analysis Started",
        description: `Processing ${data.files_to_process} files. Estimated completion: ${data.estimated_completion}`,
      });

      // Refresh data after a delay
      setTimeout(() => {
        loadIntelligenceData();
      }, 10000);

    } catch (error) {
      console.error('Error triggering analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to start evidence intelligence analysis",
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'incident': return <AlertTriangle className="h-4 w-4" />;
      case 'escalation': return <TrendingUp className="h-4 w-4" />;
      case 'threat': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'communication': return <Eye className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading evidence intelligence...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intelligence Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Case Intelligence Overview
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of your evidence and case strength
            </CardDescription>
          </div>
          <Button 
            onClick={triggerIntelligenceAnalysis}
            disabled={triggering}
            size="sm"
          >
            {triggering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Full Analysis
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {caseIntelligence ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round((caseIntelligence.overall_case_strength || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Case Strength</div>
                <Progress 
                  value={(caseIntelligence.overall_case_strength || 0) * 100} 
                  className="mt-2"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round((caseIntelligence.evidence_completeness || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Evidence Complete</div>
                <Progress 
                  value={(caseIntelligence.evidence_completeness || 0) * 100} 
                  className="mt-2"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round((caseIntelligence.pattern_coherence || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Pattern Clarity</div>
                <Progress 
                  value={(caseIntelligence.pattern_coherence || 0) * 100} 
                  className="mt-2"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round((caseIntelligence.timeline_clarity || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Timeline Clarity</div>
                <Progress 
                  value={(caseIntelligence.timeline_clarity || 0) * 100} 
                  className="mt-2"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {Math.round((caseIntelligence.legal_foundation_strength || 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Legal Foundation</div>
                <Progress 
                  value={(caseIntelligence.legal_foundation_strength || 0) * 100} 
                  className="mt-2"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No case intelligence available yet.</p>
              <p className="text-sm">Run analysis to generate comprehensive insights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Intelligence Tabs */}
      <Tabs defaultValue="strengths" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="strengths">Strengths & Gaps</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Timeline Intelligence</TabsTrigger>
          <TabsTrigger value="patterns">Behavioral Patterns</TabsTrigger>
          <TabsTrigger value="strategy">Strategy & Next Steps</TabsTrigger>
        </TabsList>

        <TabsContent value="strengths" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Case Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Case Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
              {caseIntelligence ? (
                <div className="space-y-2">
                  {Array.isArray(caseIntelligence.key_strengths) ? 
                    (caseIntelligence.key_strengths as string[]).map((strength, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    )) : 
                    <p className="text-muted-foreground text-sm">No strengths data available.</p>
                  }
                </div>
              ) : (
                  <p className="text-muted-foreground text-sm">No strengths identified yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Critical Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
              {caseIntelligence ? (
                <div className="space-y-2">
                  {Array.isArray(caseIntelligence.critical_weaknesses) ? 
                    (caseIntelligence.critical_weaknesses as string[]).map((weakness, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{weakness}</span>
                      </div>
                    )) : 
                    <p className="text-muted-foreground text-sm">No weaknesses data available.</p>
                  }
                </div>
              ) : (
                  <p className="text-muted-foreground text-sm">No critical weaknesses identified.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Evidence Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <FileSearch className="h-5 w-5" />
                Evidence Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
            {caseIntelligence ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Array.isArray(caseIntelligence.evidence_gaps) ? 
                  (caseIntelligence.evidence_gaps as string[]).map((gap, idx) => (
                    <Badge key={idx} variant="outline" className="text-yellow-700 border-yellow-300">
                      {gap}
                    </Badge>
                  )) : 
                  <p className="text-muted-foreground text-sm">No evidence gaps data available.</p>
                }
              </div>
            ) : (
                <p className="text-muted-foreground text-sm">No evidence gaps identified.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          {evidenceAnalyses.length > 0 ? (
            <div className="space-y-4">
              {evidenceAnalyses.map((analysis, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Evidence Analysis #{idx + 1}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStrengthColor(analysis.legal_strength)}>
                          {analysis.legal_strength}/100 Legal Strength
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(analysis.confidence_score * 100)}% Confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Case Impact:</h4>
                      <p className="text-sm text-muted-foreground">{analysis.case_impact}</p>
                    </div>
                    
                    {Array.isArray(analysis.key_insights) && (analysis.key_insights as string[]).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Key Insights:</h4>
                        <div className="space-y-1">
                          {(analysis.key_insights as string[]).slice(0, 3).map((insight, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-blue-500" />
                              <span className="text-xs">{insight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Array.isArray(analysis.strategic_recommendations) && (analysis.strategic_recommendations as string[]).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Recommendations:</h4>
                        <div className="space-y-1">
                          {(analysis.strategic_recommendations as string[]).slice(0, 2).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Target className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-500" />
                              <span className="text-xs">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No evidence analysis available yet.</p>
                  <p className="text-sm">Upload evidence files and run analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {timelineEvents.length > 0 ? (
            <div className="space-y-3">
              {timelineEvents.slice(0, 10).map((event, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(event.category)}
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.event_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{event.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                        {event.legal_significance && (
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <strong>Legal Significance:</strong> {event.legal_significance}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {event.evidence_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(event.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timeline events identified yet.</p>
                  <p className="text-sm">Upload evidence files to build timeline.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {casePatterns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {casePatterns.map((pattern, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm capitalize">
                        {pattern.pattern_type.replace('_', ' ')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {pattern.escalation_indicator && (
                          <Badge variant="destructive" className="text-xs">
                            Escalation
                          </Badge>
                        )}
                        <Badge className={getStrengthColor(pattern.pattern_strength * 100)}>
                          {Math.round(pattern.pattern_strength * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="text-sm text-muted-foreground">{pattern.description}</p>
                    
                    {pattern.timeline_start && pattern.timeline_end && (
                      <div className="text-xs text-muted-foreground">
                        Timeline: {new Date(pattern.timeline_start).toLocaleDateString()} - {new Date(pattern.timeline_end).toLocaleDateString()}
                      </div>
                    )}
                    
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <strong>Legal Significance:</strong> {pattern.legal_significance}
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {pattern.corroboration_status.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No behavioral patterns identified yet.</p>
                  <p className="text-sm">Upload evidence files to detect patterns.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategic Priorities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategic Priorities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(caseIntelligence?.strategic_priorities) && caseIntelligence.strategic_priorities.length > 0 ? (
                  <div className="space-y-2">
                    {(caseIntelligence.strategic_priorities as string[]).map((priority, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{priority}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No strategic priorities identified.</p>
                )}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChevronRight className="h-5 w-5" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(caseIntelligence?.next_steps) && caseIntelligence.next_steps.length > 0 ? (
                  <div className="space-y-2">
                    {(caseIntelligence.next_steps as string[]).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No next steps identified.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(caseIntelligence?.risk_factors) && caseIntelligence.risk_factors.length > 0 ? (
                <div className="space-y-2">
                  {(caseIntelligence.risk_factors as string[]).map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{risk}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No risk factors identified.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}