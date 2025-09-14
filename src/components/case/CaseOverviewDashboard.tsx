import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Target,
  ArrowRight,
  Calendar,
  Scale,
  Shield,
  AlertCircle
} from 'lucide-react';

interface CaseInsight {
  type: 'strength' | 'weakness' | 'gap' | 'opportunity' | 'risk';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  deadline?: string;
}

interface CaseMetrics {
  overallStrength: number;
  evidenceCount: number;
  legalConnections: number;
  gapsIdentified: number;
  nextActions: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface NextAction {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  deadline?: string;
  category: 'evidence' | 'legal_research' | 'documentation' | 'communication';
  completed: boolean;
}

export default function CaseOverviewDashboard() {
  const [metrics, setMetrics] = useState<CaseMetrics>({
    overallStrength: 0,
    evidenceCount: 0,
    legalConnections: 0,
    gapsIdentified: 0,
    nextActions: 0,
    riskLevel: 'medium'
  });
  
  const [insights, setInsights] = useState<CaseInsight[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCaseDashboard = async () => {
    try {
      setLoading(true);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('No authenticated user');

      // Load core metrics
      const [
        { data: files },
        { data: connections }, 
        { data: strategy },
        { data: patterns }
      ] = await Promise.all([
        supabase.from('files').select('id, name, category, status').eq('user_id', user.id),
        supabase.from('evidence_legal_connections').select('relevance_score, connection_type').eq('user_id', user.id),
        supabase.from('legal_strategy').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('case_patterns').select('*').eq('user_id', user.id)
      ]);

      // Calculate metrics
      const processedFiles = files?.filter(f => f.status === 'processed') || [];
      const strongConnections = connections?.filter(c => (c.relevance_score || 0) > 0.7) || [];
      
      const caseMetrics: CaseMetrics = {
        overallStrength: strategy?.case_strength_overall || 0,
        evidenceCount: processedFiles.length,
        legalConnections: strongConnections.length,
        gapsIdentified: (strategy?.evidence_gaps as any[])?.length || 0,
        nextActions: (strategy?.next_steps as any[])?.length || 0,
        riskLevel: strategy?.case_strength_overall > 0.7 ? 'low' : 
                  strategy?.case_strength_overall > 0.4 ? 'medium' : 'high'
      };

      // Generate insights
      const caseInsights: CaseInsight[] = [];
      
      // Strength insights
      if (caseMetrics.overallStrength > 0.7) {
        caseInsights.push({
          type: 'strength',
          title: 'Strong Case Foundation',
          description: `Your case shows ${Math.round(caseMetrics.overallStrength * 100)}% strength with solid evidence backing`,
          priority: 'high'
        });
      }
      
      // Evidence gaps
      if (caseMetrics.gapsIdentified > 0) {
        caseInsights.push({
          type: 'gap',
          title: `${caseMetrics.gapsIdentified} Evidence Gaps Identified`,
          description: 'Critical evidence missing that could strengthen your case',
          priority: 'high',
          action: 'Review evidence gaps and prioritize collection'
        });
      }

      // Weak connections
      const weakConnections = connections?.filter(c => (c.relevance_score || 0) < 0.4) || [];
      if (weakConnections.length > 0) {
        caseInsights.push({
          type: 'weakness',
          title: `${weakConnections.length} Weak Legal Connections`,
          description: 'Some evidence lacks strong legal authority backing',
          priority: 'medium',
          action: 'Research additional legal precedents'
        });
      }

      // File processing issues
      const unprocessedFiles = files?.filter(f => f.status !== 'processed') || [];
      if (unprocessedFiles.length > 0) {
        caseInsights.push({
          type: 'risk',
          title: `${unprocessedFiles.length} Files Not Processed`,
          description: 'Evidence files pending analysis may contain critical information',
          priority: 'high',
          action: 'Complete file processing immediately'
        });
      }

      // Generate next actions
      const actions: NextAction[] = [];
      
      // From strategy next steps
      if (strategy?.next_steps && Array.isArray(strategy.next_steps)) {
        strategy.next_steps.forEach((step: any, index: number) => {
          actions.push({
            id: `strategy-${index}`,
            title: step.title || step.action || 'Strategic Action',
            description: step.description || step.details || '',
            priority: step.priority || 'medium',
            category: 'documentation',
            completed: false,
            deadline: step.deadline
          });
        });
      }

      // Evidence collection actions
      if (caseMetrics.gapsIdentified > 0) {
        actions.push({
          id: 'evidence-gaps',
          title: 'Address Evidence Gaps',
          description: 'Collect missing evidence to strengthen case foundation',
          priority: 'urgent',
          category: 'evidence',
          completed: false,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }

      // Legal research actions
      if (strongConnections.length < 3) {
        actions.push({
          id: 'legal-research',
          title: 'Expand Legal Research',
          description: 'Find additional precedents and legal authorities to support your case',
          priority: 'high',
          category: 'legal_research',
          completed: false
        });
      }

      setMetrics(caseMetrics);
      setInsights(caseInsights);
      setNextActions(actions);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to load case dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseDashboard();
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'weakness': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'gap': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'opportunity': return <Target className="h-4 w-4 text-blue-600" />;
      case 'risk': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'evidence': return <FileText className="h-3 w-3" />;
      case 'legal_research': return <Scale className="h-3 w-3" />;
      case 'documentation': return <FileText className="h-3 w-3" />;
      case 'communication': return <Calendar className="h-3 w-3" />;
      default: return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading case dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Case Dashboard</h2>
          <p className="text-muted-foreground">
            Your complete case overview with actionable insights
          </p>
        </div>
        <Button onClick={loadCaseDashboard} variant="outline" size="sm">
          <ArrowRight className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Case Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Progress value={metrics.overallStrength * 100} className="h-2" />
              </div>
              <span className="text-sm font-bold">
                {Math.round(metrics.overallStrength * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall legal position
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evidence Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-2xl font-bold">{metrics.evidenceCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Processed documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Legal Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Scale className="h-4 w-4 mr-2 text-green-600" />
              <span className="text-2xl font-bold">{metrics.legalConnections}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Strong precedents found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Shield className={`h-4 w-4 mr-2 ${
                metrics.riskLevel === 'low' ? 'text-green-600' :
                metrics.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <Badge variant={metrics.riskLevel === 'low' ? 'default' : 'destructive'} className="capitalize">
                {metrics.riskLevel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Case risk assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList>
          <TabsTrigger value="insights">Key Insights</TabsTrigger>
          <TabsTrigger value="actions">Next Actions</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload evidence and run analysis to see case insights.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert key={index} className={
                  insight.type === 'strength' ? 'border-green-200 bg-green-50' :
                  insight.type === 'risk' || insight.type === 'weakness' ? 'border-red-200 bg-red-50' :
                  'border-yellow-200 bg-yellow-50'
                }>
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <Badge variant="outline" className="capitalize text-xs">
                          {insight.priority}
                        </Badge>
                      </div>
                      <AlertDescription className="mt-1 text-sm">
                        {insight.description}
                      </AlertDescription>
                      {insight.action && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm">
                            {insight.action}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {nextActions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All actions completed! Run case analysis to generate new recommendations.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {nextActions
                .sort((a, b) => {
                  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                  return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                         (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
                })
                .map((action) => (
                <Card key={action.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getCategoryIcon(action.category)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{action.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.description}
                          </p>
                          {action.deadline && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(action.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={getPriorityColor(action.priority)} className="text-xs">
                          {action.priority}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Start
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
              <CardDescription>
                Key events and milestones in your case development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Timeline view will show key case events and deadlines.</p>
                <p className="text-sm">Upload evidence to start building your case timeline.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}