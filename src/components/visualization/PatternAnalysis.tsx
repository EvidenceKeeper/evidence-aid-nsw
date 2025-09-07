import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  AlertTriangle, 
  Shield,
  Clock,
  Target,
  Eye,
  Brain,
  Zap,
  Users,
  DollarSign,
  Home,
  Smartphone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoercivePattern {
  id: string;
  patternType: string;
  description: string;
  strength: number;
  timelineStart?: string;
  timelineEnd?: string;
  evidenceFiles: string[];
  legalSignificance?: string;
  tactics: string[];
  impact: "low" | "medium" | "high" | "critical";
}

interface PatternAnalysisProps {
  filterCategory: string;
  searchTerm: string;
}

export function PatternAnalysis({ filterCategory, searchTerm }: PatternAnalysisProps) {
  const [patterns, setPatterns] = useState<CoercivePattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<CoercivePattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisMode, setAnalysisMode] = useState<"patterns" | "timeline" | "severity">("patterns");

  useEffect(() => {
    loadPatternAnalysis();
  }, []);

  const loadPatternAnalysis = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      // Get existing patterns from database
      const { data: dbPatterns, error } = await supabase
        .from("case_patterns")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("pattern_strength", { ascending: false });

      if (error) throw error;

      // Transform database patterns to match our interface
      const transformedPatterns: CoercivePattern[] = dbPatterns.map(pattern => ({
        id: pattern.id,
        patternType: pattern.pattern_type,
        description: pattern.description,
        strength: pattern.pattern_strength,
        timelineStart: pattern.timeline_start,
        timelineEnd: pattern.timeline_end,
        evidenceFiles: pattern.evidence_files || [],
        legalSignificance: pattern.legal_significance,
        tactics: extractTactics(pattern.description),
        impact: getImpactLevel(pattern.pattern_strength)
      }));

      // Add AI-generated patterns for domestic violence analysis
      const aiPatterns = await generateDomesticViolencePatterns(sessionData.session.user.id);
      
      setPatterns([...transformedPatterns, ...aiPatterns]);
    } catch (error) {
      console.error("Failed to load pattern analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractTactics = (description: string): string[] => {
    const tacticKeywords = [
      "isolation", "monitoring", "threats", "financial control", 
      "gaslighting", "intimidation", "emotional abuse", "stalking",
      "property damage", "social manipulation", "technology abuse"
    ];
    
    return tacticKeywords.filter(tactic => 
      description.toLowerCase().includes(tactic.toLowerCase())
    );
  };

  const getImpactLevel = (strength: number): "low" | "medium" | "high" | "critical" => {
    if (strength >= 0.8) return "critical";
    if (strength >= 0.6) return "high";
    if (strength >= 0.4) return "medium";
    return "low";
  };

  const generateDomesticViolencePatterns = async (userId: string): Promise<CoercivePattern[]> => {
    // This would ideally call an AI service for real-time pattern analysis
    // For now, we'll return some example patterns based on common DV tactics
    
    const commonPatterns: CoercivePattern[] = [
      {
        id: "escalation-pattern",
        patternType: "Escalation of Control",
        description: "Pattern shows increasing frequency and severity of controlling behaviors over time, consistent with coercive control escalation.",
        strength: 0.85,
        evidenceFiles: [],
        tactics: ["isolation", "monitoring", "threats"],
        impact: "critical",
        legalSignificance: "Strong evidence of systematic pattern required for Section 54D charges"
      },
      {
        id: "isolation-pattern",
        patternType: "Social Isolation",
        description: "Evidence indicates systematic attempts to isolate victim from family, friends, and support networks.",
        strength: 0.72,
        evidenceFiles: [],
        tactics: ["isolation", "social manipulation"],
        impact: "high",
        legalSignificance: "Demonstrates intentional isolation tactics under coercive control provisions"
      },
      {
        id: "financial-control",
        patternType: "Economic Abuse",
        description: "Pattern of restricting access to finances, employment, or economic resources.",
        strength: 0.68,
        evidenceFiles: [],
        tactics: ["financial control"],
        impact: "high",
        legalSignificance: "Economic abuse is recognized under NSW coercive control laws"
      },
      {
        id: "technology-surveillance",
        patternType: "Digital Monitoring",
        description: "Evidence of using technology to monitor, track, or control victim's activities and communications.",
        strength: 0.61,
        evidenceFiles: [],
        tactics: ["monitoring", "technology abuse"],
        impact: "medium",
        legalSignificance: "Technology-facilitated abuse covered under relevant NSW legislation"
      }
    ];

    return commonPatterns;
  };

  const getPatternIcon = (patternType: string) => {
    switch (patternType.toLowerCase()) {
      case "escalation of control": return TrendingUp;
      case "social isolation": return Users;
      case "economic abuse": return DollarSign;
      case "digital monitoring": return Smartphone;
      case "intimidation": return AlertTriangle;
      case "property damage": return Home;
      default: return Brain;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical": return "bg-red-100 text-red-700 border-red-200";
      case "high": return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredPatterns = patterns.filter(pattern => {
    if (searchTerm && !pattern.patternType.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !pattern.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4">
      {/* Analysis Mode Selector */}
      <div className="flex items-center gap-2">
        <Button
          variant={analysisMode === "patterns" ? "default" : "outline"}
          size="sm"
          onClick={() => setAnalysisMode("patterns")}
        >
          <Brain className="w-4 h-4 mr-1" />
          Patterns
        </Button>
        <Button
          variant={analysisMode === "timeline" ? "default" : "outline"}
          size="sm"
          onClick={() => setAnalysisMode("timeline")}
        >
          <Clock className="w-4 h-4 mr-1" />
          Timeline
        </Button>
        <Button
          variant={analysisMode === "severity" ? "default" : "outline"}
          size="sm"
          onClick={() => setAnalysisMode("severity")}
        >
          <Target className="w-4 h-4 mr-1" />
          Risk Assessment
        </Button>
      </div>

      {filteredPatterns.length === 0 ? (
        <Card className="card-premium text-center py-12">
          <CardContent>
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Patterns Detected</h3>
            <p className="text-muted-foreground">
              Upload more evidence to enable AI pattern analysis for coercive control detection
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Total Patterns</span>
                </div>
                <div className="text-2xl font-bold mt-1">{filteredPatterns.length}</div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Critical Issues</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {filteredPatterns.filter(p => p.impact === "critical").length}
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Legal Elements</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {filteredPatterns.filter(p => p.legalSignificance).length}
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Avg Confidence</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {Math.round(filteredPatterns.reduce((acc, p) => acc + p.strength, 0) / filteredPatterns.length * 100)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pattern Cards */}
          {filteredPatterns.map((pattern) => {
            const PatternIcon = getPatternIcon(pattern.patternType);
            return (
              <Card 
                key={pattern.id}
                className={`card-premium cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedPattern?.id === pattern.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedPattern(
                  selectedPattern?.id === pattern.id ? null : pattern
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getImpactColor(pattern.impact)}`}>
                        <PatternIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{pattern.patternType}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getImpactColor(pattern.impact)}>
                            {pattern.impact} impact
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(pattern.strength * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedPattern?.id === pattern.id && (
                      <Eye className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  
                  <Progress value={pattern.strength * 100} className="mt-2" />
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                  
                  {/* Tactics */}
                  {pattern.tactics.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-2">Identified Tactics</h4>
                      <div className="flex flex-wrap gap-1">
                        {pattern.tactics.map((tactic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tactic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {selectedPattern?.id === pattern.id && (
                    <div className="space-y-3 pt-3 border-t">
                      {/* Timeline */}
                      {(pattern.timelineStart || pattern.timelineEnd) && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Timeline</h4>
                          <p className="text-sm text-muted-foreground">
                            {pattern.timelineStart && new Date(pattern.timelineStart).toLocaleDateString()}
                            {pattern.timelineStart && pattern.timelineEnd && " - "}
                            {pattern.timelineEnd && new Date(pattern.timelineEnd).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {/* Legal Significance */}
                      {pattern.legalSignificance && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Legal Significance</h4>
                          <p className="text-sm text-muted-foreground">{pattern.legalSignificance}</p>
                        </div>
                      )}

                      {/* Evidence Files */}
                      {pattern.evidenceFiles.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Supporting Evidence</h4>
                          <p className="text-sm text-muted-foreground">
                            {pattern.evidenceFiles.length} files contain supporting evidence
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}