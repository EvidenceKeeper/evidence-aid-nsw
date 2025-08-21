import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  FileText,
  Calendar,
  MessageSquare
} from "lucide-react";

interface CaseStats {
  totalFiles: number;
  processedFiles: number;
  timelineEvents: number;
  verifiedEvents: number;
  evidenceGaps: string[];
  caseStrength: number;
}

export function CaseStrengthMeter() {
  const [stats, setStats] = useState<CaseStats>({
    totalFiles: 0,
    processedFiles: 0,
    timelineEvents: 0,
    verifiedEvents: 0,
    evidenceGaps: [],
    caseStrength: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaseStats();
  }, []);

  const loadCaseStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get file stats
      const { data: files } = await supabase
        .from("files")
        .select("id, status, category")
        .eq("user_id", session.user.id);

      // Get timeline stats  
      const { data: events } = await supabase
        .from("timeline_events")
        .select("id, verified, category")
        .eq("user_id", session.user.id);

      const totalFiles = files?.length || 0;
      const processedFiles = files?.filter(f => f.status === 'processed').length || 0;
      const timelineEvents = events?.length || 0;
      const verifiedEvents = events?.filter(e => e.verified).length || 0;

      // Calculate evidence gaps
      const categories = ['messages', 'photos', 'documents', 'medical', 'financial', 'witness'];
      const fileCategories = new Set(files?.map(f => f.category).filter(Boolean));
      const evidenceGaps = categories.filter(cat => !fileCategories.has(cat));

      // Calculate case strength (0-100)
      let strength = 0;
      if (totalFiles > 0) strength += 20;
      if (processedFiles > 2) strength += 20;
      if (timelineEvents > 0) strength += 20;
      if (verifiedEvents > timelineEvents * 0.5) strength += 20;
      if (evidenceGaps.length < 3) strength += 20;

      setStats({
        totalFiles,
        processedFiles,
        timelineEvents,
        verifiedEvents,
        evidenceGaps,
        caseStrength: strength
      });
    } catch (error) {
      console.error("Error loading case stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (strength >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 80) return "Strong Case";
    if (strength >= 60) return "Developing Case";
    if (strength >= 40) return "Building Evidence";
    return "Getting Started";
  };

  const getStrengthIcon = (strength: number) => {
    if (strength >= 80) return CheckCircle;
    if (strength >= 60) return TrendingUp;
    return AlertTriangle;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const StrengthIcon = getStrengthIcon(stats.caseStrength);

  return (
    <div className="space-y-6">
      {/* Case Strength Overview */}
      <Card className={`border-2 ${getStrengthColor(stats.caseStrength)}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${getStrengthColor(stats.caseStrength)}`}>
              <StrengthIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{getStrengthLabel(stats.caseStrength)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your case is {stats.caseStrength}% ready for legal proceedings
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress 
            value={stats.caseStrength} 
            className="h-3 mb-4"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{stats.processedFiles}</span>
              </div>
              <p className="text-xs text-muted-foreground">Organized Files</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{stats.timelineEvents}</span>
              </div>
              <p className="text-xs text-muted-foreground">Timeline Events</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{stats.verifiedEvents}</span>
              </div>
              <p className="text-xs text-muted-foreground">Verified Events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Gaps */}
      {stats.evidenceGaps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-lg">Strengthen Your Case</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Adding these types of evidence could make your case stronger
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.evidenceGaps.includes('messages') && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Add Communication Evidence</p>
                    <p className="text-sm text-blue-700">Text messages, emails, or social media posts</p>
                  </div>
                </div>
              )}
              {stats.evidenceGaps.includes('medical') && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Add Medical Documentation</p>
                    <p className="text-sm text-red-700">Doctor reports, hospital records, or therapy notes</p>
                  </div>
                </div>
              )}
              {stats.evidenceGaps.includes('witness') && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-800">Add Witness Statements</p>
                    <p className="text-sm text-purple-700">Statements from family, friends, or professionals</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Your Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.totalFiles === 0 && (
              <p className="text-sm">• Start by uploading your first piece of evidence</p>
            )}
            {stats.processedFiles < stats.totalFiles && (
              <p className="text-sm">• Process remaining files to organize them automatically</p>
            )}
            {stats.timelineEvents === 0 && stats.processedFiles > 0 && (
              <p className="text-sm">• Build your timeline from organized evidence</p>
            )}
            {stats.verifiedEvents < stats.timelineEvents && (
              <p className="text-sm">• Review and verify timeline events for accuracy</p>
            )}
            {stats.caseStrength >= 60 && (
              <p className="text-sm text-green-700">• Your case is developing well! Consider consulting with a lawyer.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}