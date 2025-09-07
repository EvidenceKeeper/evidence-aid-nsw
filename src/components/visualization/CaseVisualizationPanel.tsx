import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Network, Map, TrendingUp, Filter, Search, Eye, EyeOff } from "lucide-react";
import { EnhancedTimeline } from "./EnhancedTimeline";
import { CaseMindMap } from "./CaseMindMap";
import { EvidenceWeb } from "./EvidenceWeb";
import { PatternAnalysis } from "./PatternAnalysis";
import { CaseOverviewDashboard } from "./CaseOverviewDashboard";

interface CaseVisualizationPanelProps {
  activeView: "timeline" | "mindmap" | "evidence-web" | "patterns";
  onViewChange: (view: "timeline" | "mindmap" | "evidence-web" | "patterns") => void;
}

export function CaseVisualizationPanel({ activeView, onViewChange }: CaseVisualizationPanelProps) {
  const [showOverview, setShowOverview] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const viewButtons = [
    { id: "timeline" as const, label: "Timeline", icon: Clock, description: "Chronological events" },
    { id: "mindmap" as const, label: "Mind Map", icon: Network, description: "Relationship mapping" },
    { id: "evidence-web" as const, label: "Evidence Web", icon: Map, description: "Evidence connections" },
    { id: "patterns" as const, label: "Patterns", icon: TrendingUp, description: "AI pattern analysis" },
  ];

  const categories = [
    { id: "all", label: "All Evidence", color: "bg-muted" },
    { id: "communication", label: "Messages", color: "bg-category-message/20 text-category-message" },
    { id: "incident", label: "Incidents", color: "bg-destructive/20 text-destructive" },
    { id: "medical", label: "Medical", color: "bg-category-medical/20 text-category-medical" },
    { id: "financial", label: "Financial", color: "bg-category-financial/20 text-category-financial" },
    { id: "photo", label: "Photos", color: "bg-category-photo/20 text-category-photo" },
    { id: "witness", label: "Witness", color: "bg-category-witness/20 text-category-witness" },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Case Visualization</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis of your evidence and case timeline
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOverview(!showOverview)}
            className="flex items-center gap-2"
          >
            {showOverview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showOverview ? "Hide" : "Show"} Overview
          </Button>
        </div>

        {/* View Navigation */}
        <div className="flex flex-wrap gap-2">
          {viewButtons.map((view) => {
            const Icon = view.icon;
            return (
              <Button
                key={view.id}
                variant={activeView === view.id ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange(view.id)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {view.label}
              </Button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={filterCategory === category.id ? "default" : "outline"}
              className={`cursor-pointer text-xs ${
                filterCategory === category.id 
                  ? "bg-primary text-primary-foreground" 
                  : category.color
              }`}
              onClick={() => setFilterCategory(category.id)}
            >
              {category.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showOverview && (
          <div className="border-b border-border">
            <CaseOverviewDashboard />
          </div>
        )}
        
        <div className="h-full p-4">
          {activeView === "timeline" && (
            <EnhancedTimeline 
              filterCategory={filterCategory} 
              searchTerm={searchTerm}
            />
          )}
          {activeView === "mindmap" && (
            <CaseMindMap 
              filterCategory={filterCategory} 
              searchTerm={searchTerm}
            />
          )}
          {activeView === "evidence-web" && (
            <EvidenceWeb 
              filterCategory={filterCategory} 
              searchTerm={searchTerm}
            />
          )}
          {activeView === "patterns" && (
            <PatternAnalysis 
              filterCategory={filterCategory} 
              searchTerm={searchTerm}
            />
          )}
        </div>
      </div>
    </div>
  );
}