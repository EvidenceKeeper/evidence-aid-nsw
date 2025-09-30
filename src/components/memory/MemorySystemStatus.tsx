import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Settings, TrendingUp } from "lucide-react";
import { useUnifiedMemory } from "./UnifiedMemoryProvider";

export function MemorySystemStatus() {
  const { settings, caseMemory, caseStrength, updateSettings } = useUnifiedMemory();

  const getSystemHealth = () => {
    const enabledFeatures = Object.values(settings).filter(Boolean).length;
    const totalFeatures = Object.keys(settings).length;
    const healthPercent = Math.round((enabledFeatures / totalFeatures) * 100);
    
    if (healthPercent >= 80) return { status: "Optimal", color: "green" };
    if (healthPercent >= 60) return { status: "Good", color: "blue" };
    if (healthPercent >= 40) return { status: "Moderate", color: "yellow" };
    return { status: "Limited", color: "red" };
  };

  const health = getSystemHealth();

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Optimized Memory System
          <Badge variant="outline" className={`text-${health.color}-600 border-${health.color}-200`}>
            {health.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              Active Features
            </div>
            <div className="space-y-1">
              {settings.proactiveTriggersActive && (
                <Badge variant="secondary" className="text-xs">
                  Proactive Triggers
                </Badge>
              )}
              {settings.vectorSearchActive && (
                <Badge variant="secondary" className="text-xs">
                  Vector Search
                </Badge>
              )}
              {settings.caseStrengthMonitoring && (
                <Badge variant="secondary" className="text-xs">
                  Case Monitoring
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Memory Stats
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Case Strength: {caseStrength.score}/10</div>
              <div>Evidence: {caseMemory?.evidence_index?.length || 0} items</div>
              <div>Goal: {caseMemory?.primary_goal ? "Set" : "Pending"}</div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">
            ⚡ Optimized: Single provider, reduced complexity, improved performance
          </div>
          <div className="text-xs text-green-600">
            ✓ Consolidated 4 providers into 1 unified system
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => updateSettings({ 
              proactiveTriggersActive: !settings.proactiveTriggersActive 
            })}
          >
            <Settings className="h-3 w-3 mr-1" />
            Toggle Proactive
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => updateSettings({ 
              communicationStyle: settings.communicationStyle === 'gentle' ? 'collaborative' : 'gentle'
            })}
          >
            Style: {settings.communicationStyle}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}