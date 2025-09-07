import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  Users,
  Scale
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CaseStats {
  totalFiles: number;
  timelineEvents: number;
  unverifiedEvents: number;
  patternCount: number;
  caseStrength: number;
  latestActivity: string;
  keyParties: string[];
  criticalDates: Array<{ date: string; description: string }>;
}

export function CaseOverviewDashboard() {
  const [stats, setStats] = useState<CaseStats>({
    totalFiles: 0,
    timelineEvents: 0,
    unverifiedEvents: 0,
    patternCount: 0,
    caseStrength: 0,
    latestActivity: "",
    keyParties: [],
    criticalDates: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaseStats();
  }, []);

  const loadCaseStats = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const userId = sessionData.session.user.id;

      // Get files count
      const { count: filesCount } = await supabase
        .from("files")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "processed");

      // Get timeline events
      const { data: timelineData, count: timelineCount } = await supabase
        .from("timeline_events")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      // Get unverified events
      const { count: unverifiedCount } = await supabase
        .from("timeline_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("verified", false);

      // Get patterns count
      const { count: patternsCount } = await supabase
        .from("case_patterns")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get case strength from legal strategy
      const { data: strategyData } = await supabase
        .from("legal_strategy")
        .select("case_strength_overall")
        .eq("user_id", userId)
        .single();

      // Get latest timeline event for activity
      const latestEvent = timelineData?.[0];
      
      // Extract critical dates (high confidence events)
      const criticalDates = timelineData
        ?.filter(event => event.confidence && event.confidence > 0.8)
        .slice(0, 3)
        .map(event => ({
          date: event.event_date,
          description: event.title
        })) || [];

      setStats({
        totalFiles: filesCount || 0,
        timelineEvents: timelineCount || 0,
        unverifiedEvents: unverifiedCount || 0,
        patternCount: patternsCount || 0,
        caseStrength: (strategyData?.case_strength_overall || 0) * 100,
        latestActivity: latestEvent?.title || "No recent activity",
        keyParties: ["Complainant", "Respondent"], // TODO: Extract from case memory
        criticalDates
      });
    } catch (error) {
      console.error("Failed to load case stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-6 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 75) return "text-emerald-600 border-emerald-200 bg-emerald-50";
    if (strength >= 50) return "text-amber-600 border-amber-200 bg-amber-50";
    return "text-red-600 border-red-200 bg-red-50";
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 75) return "Strong";
    if (strength >= 50) return "Moderate";
    return "Developing";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Evidence Files</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalFiles}</div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Timeline Events</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.timelineEvents}</div>
            {stats.unverifiedEvents > 0 && (
              <div className="text-xs text-muted-foreground">
                {stats.unverifiedEvents} need verification
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warm" />
              <span className="text-sm font-medium">Patterns Found</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.patternCount}</div>
          </CardContent>
        </Card>

        <Card className={`border ${getStrengthColor(stats.caseStrength)}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span className="text-sm font-medium">Case Strength</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-2xl font-bold">{Math.round(stats.caseStrength)}%</div>
              <Badge variant="outline" className="text-xs">
                {getStrengthLabel(stats.caseStrength)}
              </Badge>
            </div>
            <Progress value={stats.caseStrength} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Critical Information */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Critical Dates */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Critical Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.criticalDates.length > 0 ? (
              stats.criticalDates.map((date, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(date.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium truncate ml-2">{date.description}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No critical dates identified yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Case Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Latest: </span>
                <span className="font-medium">{stats.latestActivity}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Key Parties: </span>
                <span className="font-medium">{stats.keyParties.join(", ")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}