import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Link2, 
  ArrowRight, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Network,
  Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EvidenceConnection {
  id: string;
  sourceFile: {
    id: string;
    name: string;
    category?: string;
  };
  targetFile: {
    id: string;
    name: string;
    category?: string;
  };
  relationshipType: string;
  confidence: number;
  description?: string;
}

interface EvidenceWebProps {
  filterCategory: string;
  searchTerm: string;
}

export function EvidenceWeb({ filterCategory, searchTerm }: EvidenceWebProps) {
  const [connections, setConnections] = useState<EvidenceConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<EvidenceConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"web" | "list">("web");

  useEffect(() => {
    loadEvidenceConnections();
  }, []);

  const loadEvidenceConnections = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data: relationships, error } = await supabase
        .from("evidence_relationships")
        .select("*")
        .eq("user_id", sessionData.session.user.id);

      if (error) throw error;

      // Get file details separately
      const { data: files } = await supabase
        .from("files")
        .select("id, name, category")
        .eq("user_id", sessionData.session.user.id);

      const formattedConnections: EvidenceConnection[] = relationships?.map(rel => {
        const sourceFile = files?.find(f => f.id === rel.source_file_id) || { id: rel.source_file_id, name: "Unknown File", category: undefined };
        const targetFile = files?.find(f => f.id === rel.target_file_id) || { id: rel.target_file_id, name: "Unknown File", category: undefined };
        
        return {
          id: rel.id,
          sourceFile,
          targetFile,
          relationshipType: rel.relationship_type,
          confidence: rel.confidence,
          description: rel.description
        };
      }) || [];

      setConnections(formattedConnections);
    } catch (error) {
      console.error("Failed to load evidence connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "supports": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "contradicts": return "text-red-600 bg-red-50 border-red-200";
      case "references": return "text-blue-600 bg-blue-50 border-blue-200";
      case "sequence": return "text-purple-600 bg-purple-50 border-purple-200";
      case "corroborates": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case "supports": return CheckCircle;
      case "contradicts": return AlertTriangle;
      case "references": return Link2;
      case "sequence": return ArrowRight;
      case "corroborates": return Shield;
      default: return Network;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "communication": return "bg-blue-100 text-blue-700";
      case "incident": return "bg-red-100 text-red-700";
      case "photo": return "bg-orange-100 text-orange-700";
      case "medical": return "bg-pink-100 text-pink-700";
      case "financial": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const filteredConnections = connections.filter(conn => {
    if (filterCategory !== "all" && 
        conn.sourceFile.category !== filterCategory && 
        conn.targetFile.category !== filterCategory) return false;
    
    if (searchTerm && 
        !conn.sourceFile.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !conn.targetFile.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !conn.relationshipType.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
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
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "web" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("web")}
          >
            <Network className="w-4 h-4 mr-1" />
            Web View
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Layers className="w-4 h-4 mr-1" />
            List View
          </Button>
        </div>
        
        <Badge variant="outline" className="text-xs">
          {filteredConnections.length} connections found
        </Badge>
      </div>

      {filteredConnections.length === 0 ? (
        <Card className="card-premium text-center py-12">
          <CardContent>
            <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Evidence Connections</h3>
            <p className="text-muted-foreground">
              Upload more evidence files to discover relationships between your documents
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filteredConnections.map((connection) => {
            const RelationshipIcon = getRelationshipIcon(connection.relationshipType);
            return (
              <Card 
                key={connection.id}
                className={`card-premium cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedConnection?.id === connection.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedConnection(
                  selectedConnection?.id === connection.id ? null : connection
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Source and Target Files */}
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {connection.sourceFile.name}
                            </span>
                            {connection.sourceFile.category && (
                              <Badge variant="outline" className={`text-xs ${getCategoryColor(connection.sourceFile.category)}`}>
                                {connection.sourceFile.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <RelationshipIcon className="w-4 h-4" />
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRelationshipColor(connection.relationshipType)}`}
                          >
                            {connection.relationshipType}
                          </Badge>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {connection.targetFile.name}
                            </span>
                            {connection.targetFile.category && (
                              <Badge variant="outline" className={`text-xs ${getCategoryColor(connection.targetFile.category)}`}>
                                {connection.targetFile.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Confidence and Description */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Confidence: {Math.round(connection.confidence * 100)}%
                          </span>
                          <Progress value={connection.confidence * 100} className="w-16 h-1" />
                        </div>
                        {selectedConnection?.id === connection.id && (
                          <Eye className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedConnection?.id === connection.id && connection.description && (
                    <div className="mt-4 pt-4 border-t bg-muted/30 rounded-md p-3">
                      <h4 className="text-sm font-medium mb-2">Relationship Details</h4>
                      <p className="text-sm text-muted-foreground">{connection.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Web View - Simplified Network Visualization */
        <Card className="card-premium h-[calc(100vh-250px)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Evidence Network</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <div className="relative w-full h-full bg-gradient-to-br from-muted/20 to-background rounded border">
              {/* Simplified network visualization */}
              <div className="absolute inset-4 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Network className="w-16 h-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Interactive Evidence Web</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Advanced network visualization coming soon
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use List View to explore evidence connections in detail
                    </p>
                  </div>
                  
                  {/* Connection Summary */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {Object.entries(
                      filteredConnections.reduce((acc, conn) => {
                        acc[conn.relationshipType] = (acc[conn.relationshipType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => {
                      const Icon = getRelationshipIcon(type);
                      return (
                        <div key={type} className="text-center p-3 bg-card rounded border">
                          <Icon className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {type} relationships
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}