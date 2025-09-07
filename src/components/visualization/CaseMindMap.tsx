import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MessageCircle, 
  AlertTriangle, 
  Building,
  Calendar,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MindMapNode {
  id: string;
  type: "person" | "incident" | "location" | "communication" | "evidence";
  title: string;
  subtitle?: string;
  connections: string[];
  metadata: any;
  x: number;
  y: number;
  category?: string;
}

interface CaseMindMapProps {
  filterCategory: string;
  searchTerm: string;
}

export function CaseMindMap({ filterCategory, searchTerm }: CaseMindMapProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buildMindMap();
  }, []);

  const buildMindMap = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      // Get case memory for key entities
      const { data: caseMemory } = await supabase
        .from("case_memory")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .single();

      // Get timeline events for incident nodes
      const { data: timelineEvents } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .limit(20);

      // Get evidence relationships
      const { data: relationships } = await supabase
        .from("evidence_relationships")
        .select("*")
        .eq("user_id", sessionData.session.user.id);

      // Get files for evidence nodes
      const { data: files } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .eq("status", "processed")
        .limit(15);

      const mindMapNodes: MindMapNode[] = [];

      // Create central case node
      mindMapNodes.push({
        id: "case-center",
        type: "incident",
        title: "Your Case",
        subtitle: "Central Hub",
        connections: [],
        metadata: {},
        x: 400,
        y: 300
      });

      // Add person nodes from case memory
      if (caseMemory?.parties) {
        const parties = Array.isArray(caseMemory.parties) ? caseMemory.parties : [];
        parties.forEach((party: any, index: number) => {
          const angle = (index / parties.length) * 2 * Math.PI;
          mindMapNodes.push({
            id: `person-${index}`,
            type: "person",
            title: party.name || `Person ${index + 1}`,
            subtitle: party.role || "Involved Party",
            connections: ["case-center"],
            metadata: party,
            x: 400 + Math.cos(angle) * 150,
            y: 300 + Math.sin(angle) * 150
          });
        });
      }

      // Add incident nodes from timeline
      timelineEvents?.slice(0, 8).forEach((event, index) => {
        const angle = (index / 8) * 2 * Math.PI + Math.PI / 4;
        mindMapNodes.push({
          id: `incident-${event.id}`,
          type: "incident",
          title: event.title,
          subtitle: new Date(event.event_date).toLocaleDateString(),
          connections: ["case-center"],
          metadata: event,
          category: event.category,
          x: 400 + Math.cos(angle) * 200,
          y: 300 + Math.sin(angle) * 200
        });
      });

      // Add evidence nodes from files
      files?.slice(0, 6).forEach((file, index) => {
        const angle = (index / 6) * 2 * Math.PI + Math.PI / 6;
        mindMapNodes.push({
          id: `evidence-${file.id}`,
          type: "evidence",
          title: file.name,
          subtitle: file.category || "Evidence",
          connections: ["case-center"],
          metadata: file,
          category: file.category,
          x: 400 + Math.cos(angle) * 120,
          y: 300 + Math.sin(angle) * 120
        });
      });

      // Add relationship connections
      relationships?.forEach((rel) => {
        const sourceNode = mindMapNodes.find(n => n.metadata.id === rel.source_file_id);
        const targetNode = mindMapNodes.find(n => n.metadata.id === rel.target_file_id);
        
        if (sourceNode && targetNode && !sourceNode.connections.includes(targetNode.id)) {
          sourceNode.connections.push(targetNode.id);
        }
      });

      setNodes(mindMapNodes);
    } catch (error) {
      console.error("Failed to build mind map:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "person": return Users;
      case "incident": return AlertTriangle;
      case "location": return MapPin;
      case "communication": return MessageCircle;
      case "evidence": return FileText;
      default: return Building;
    }
  };

  const getNodeColor = (type: string, category?: string) => {
    if (category) {
      switch (category) {
        case "communication": return "bg-blue-100 border-blue-300 text-blue-700";
        case "incident": return "bg-red-100 border-red-300 text-red-700";
        case "photo": return "bg-orange-100 border-orange-300 text-orange-700";
        case "medical": return "bg-pink-100 border-pink-300 text-pink-700";
        case "financial": return "bg-yellow-100 border-yellow-300 text-yellow-700";
        default: return "bg-gray-100 border-gray-300 text-gray-700";
      }
    }

    switch (type) {
      case "person": return "bg-purple-100 border-purple-300 text-purple-700";
      case "incident": return "bg-red-100 border-red-300 text-red-700";
      case "location": return "bg-green-100 border-green-300 text-green-700";
      case "communication": return "bg-blue-100 border-blue-300 text-blue-700";
      case "evidence": return "bg-amber-100 border-amber-300 text-amber-700";
      default: return "bg-gray-100 border-gray-300 text-gray-700";
    }
  };

  const filteredNodes = nodes.filter(node => {
    if (filterCategory !== "all" && node.category && node.category !== filterCategory) return false;
    if (searchTerm && !node.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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
    <div className="h-full flex">
      {/* Mind Map Visualization */}
      <div className="flex-1 relative bg-gradient-to-br from-background to-muted/20 rounded-lg border overflow-hidden">
        <svg className="w-full h-full">
          {/* Connection lines */}
          {filteredNodes.map(node => 
            node.connections.map(connectionId => {
              const targetNode = filteredNodes.find(n => n.id === connectionId);
              if (!targetNode) return null;
              
              return (
                <line
                  key={`${node.id}-${connectionId}`}
                  x1={node.x}
                  y1={node.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.6"
                />
              );
            })
          )}
        </svg>

        {/* Node elements */}
        {filteredNodes.map(node => {
          const Icon = getNodeIcon(node.type);
          return (
            <div
              key={node.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedNode?.id === node.id ? 'scale-110 z-10' : ''
              }`}
              style={{ left: node.x, top: node.y }}
              onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
            >
              <div className={`
                rounded-lg border-2 p-3 min-w-[120px] text-center shadow-lg backdrop-blur-sm
                ${getNodeColor(node.type, node.category)}
                ${selectedNode?.id === node.id ? 'ring-2 ring-primary' : ''}
              `}>
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium truncate">{node.title}</div>
                {node.subtitle && (
                  <div className="text-xs opacity-75 truncate">{node.subtitle}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Panel */}
      {selectedNode && (
        <div className="w-80 border-l border-border bg-card p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedNode.title}</CardTitle>
              {selectedNode.subtitle && (
                <p className="text-sm text-muted-foreground">{selectedNode.subtitle}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className={getNodeColor(selectedNode.type, selectedNode.category)}>
                {selectedNode.type} {selectedNode.category && `• ${selectedNode.category}`}
              </Badge>

              {/* Node-specific details */}
              {selectedNode.type === "incident" && selectedNode.metadata.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedNode.metadata.description}</p>
                </div>
              )}

              {selectedNode.type === "evidence" && (
                <div>
                  <h4 className="text-sm font-medium mb-1">File Details</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {selectedNode.metadata.mime_type && (
                      <p>Type: {selectedNode.metadata.mime_type}</p>
                    )}
                    {selectedNode.metadata.size && (
                      <p>Size: {Math.round(selectedNode.metadata.size / 1024)} KB</p>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.type === "person" && selectedNode.metadata.role && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Role</h4>
                  <p className="text-sm text-muted-foreground">{selectedNode.metadata.role}</p>
                </div>
              )}

              {/* Connections */}
              {selectedNode.connections.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Connected to</h4>
                  <div className="space-y-1">
                    {selectedNode.connections.map(connectionId => {
                      const connectedNode = nodes.find(n => n.id === connectionId);
                      if (!connectedNode) return null;
                      
                      return (
                        <div
                          key={connectionId}
                          className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => setSelectedNode(connectedNode)}
                        >
                          <ArrowRight className="w-3 h-3" />
                          {connectedNode.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}