import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, CheckCircle2, FileText, Calendar, Scale } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface CaseStrength {
  case_strength_score: number;
  strengths: string[];
  critical_gaps: string[];
  legal_elements_met: Record<string, number>;
  evidence_summary: {
    total_files: number;
    timeline_events: number;
    legal_connections: number;
  };
}

export function CaseStrengthMonitor() {
  const [caseStrength, setCaseStrength] = useState<CaseStrength | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaseStrength();

    // Subscribe to case memory updates
    const channel = supabase
      .channel('case-strength-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'case_memory',
      }, () => {
        loadCaseStrength();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCaseStrength = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('analyze-case-strength', {
        body: { user_id: user.id }
      });

      if (!error && data) {
        setCaseStrength(data);
      }
    } catch (error) {
      console.error('Failed to load case strength:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !caseStrength) {
    return null;
  }

  const strengthColor = 
    caseStrength.case_strength_score >= 70 ? 'text-green-600' :
    caseStrength.case_strength_score >= 40 ? 'text-yellow-600' : 'text-red-600';

  const strengthLabel = 
    caseStrength.case_strength_score >= 70 ? 'Strong' :
    caseStrength.case_strength_score >= 40 ? 'Developing' : 'Early Stage';

  return (
    <div className="space-y-4">
      {/* Case Strength Score */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Case Strength
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${strengthColor}`}>
              {caseStrength.case_strength_score}%
            </span>
            <Badge variant={caseStrength.case_strength_score >= 70 ? 'default' : 'outline'}>
              {strengthLabel}
            </Badge>
          </div>
          <Progress value={caseStrength.case_strength_score} className="h-2" />
        </CardContent>
      </Card>

      {/* Evidence Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Evidence Collected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              Documents
            </span>
            <span className="font-semibold">{caseStrength.evidence_summary.total_files}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Timeline Events
            </span>
            <span className="font-semibold">{caseStrength.evidence_summary.timeline_events}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Scale className="h-4 w-4" />
              Legal Connections
            </span>
            <span className="font-semibold">{caseStrength.evidence_summary.legal_connections}</span>
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {caseStrength.strengths.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {caseStrength.strengths.slice(0, 3).map((strength, idx) => (
                <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Critical Gaps */}
      {caseStrength.critical_gaps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {caseStrength.critical_gaps.slice(0, 3).map((gap, idx) => (
                <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Legal Elements Progress */}
      {Object.keys(caseStrength.legal_elements_met).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Legal Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(caseStrength.legal_elements_met).map(([element, score]) => (
              <div key={element} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {element.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">{Math.round(score * 100)}%</span>
                </div>
                <Progress value={score * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
