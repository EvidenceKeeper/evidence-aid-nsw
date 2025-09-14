import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Network, 
  FileText, 
  Scale, 
  Users, 
  BookOpen,
  RefreshCw,
  Maximize2,
  Filter
} from 'lucide-react';
import * as THREE from 'three';

interface GraphNode {
  id: string;
  type: 'evidence' | 'legal_authority' | 'case_pattern' | 'strategy' | 'connection';
  title: string;
  position: [number, number, number];
  connections: string[];
  metadata: any;
  strength?: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: Array<{
    from: string;
    to: string;
    strength: number;
    type: string;
  }>;
}

function GraphNode({ 
  node, 
  isSelected, 
  onSelect,
  scale = 1 
}: { 
  node: GraphNode;
  isSelected: boolean;
  onSelect: (node: GraphNode) => void;
  scale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (hovered || isSelected) {
        meshRef.current.scale.setScalar(scale * 1.2);
      } else {
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'evidence': return '#3b82f6'; // blue
      case 'legal_authority': return '#dc2626'; // red
      case 'case_pattern': return '#16a34a'; // green
      case 'strategy': return '#7c3aed'; // purple
      case 'connection': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  const getNodeSize = (type: string, strength = 0.5) => {
    const baseSize = 0.5;
    const strengthMultiplier = 0.5 + strength * 0.5;
    
    switch (type) {
      case 'evidence': return baseSize * strengthMultiplier;
      case 'legal_authority': return baseSize * 1.2 * strengthMultiplier;
      case 'case_pattern': return baseSize * 0.8 * strengthMultiplier;
      case 'strategy': return baseSize * 1.1 * strengthMultiplier;
      default: return baseSize * 0.6;
    }
  };

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={() => onSelect(node)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[getNodeSize(node.type, node.strength), 16, 16]} />
        <meshStandardMaterial 
          color={getNodeColor(node.type)}
          emissive={isSelected || hovered ? getNodeColor(node.type) : '#000000'}
          emissiveIntensity={isSelected || hovered ? 0.2 : 0}
        />
      </mesh>
      
      <Text
        position={[0, getNodeSize(node.type, node.strength) + 0.5, 0]}
        fontSize={0.3}
        color={getNodeColor(node.type)}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {node.title.length > 20 ? `${node.title.substring(0, 20)}...` : node.title}
      </Text>
    </group>
  );
}

function ConnectionLine({ 
  start, 
  end, 
  strength,
  type 
}: { 
  start: [number, number, number];
  end: [number, number, number];
  strength: number;
  type: string;
}) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  
  const getLineColor = (type: string) => {
    switch (type) {
      case 'direct_evidence': return '#10b981';
      case 'supporting_evidence': return '#3b82f6';
      case 'circumstantial_evidence': return '#f59e0b';
      case 'legal_precedent': return '#dc2626';
      case 'case_strategy': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  return (
    <Line
      points={points}
      color={getLineColor(type)}
      lineWidth={Math.max(1, strength * 5)}
      opacity={0.6 + strength * 0.4}
      transparent
    />
  );
}

function Graph3D({ 
  data, 
  selectedNode, 
  onNodeSelect,
  filter 
}: { 
  data: GraphData;
  selectedNode: GraphNode | null;
  onNodeSelect: (node: GraphNode) => void;
  filter: string;
}) {
  const filteredNodes = data.nodes.filter(node => {
    if (filter === 'all') return true;
    return node.type === filter;
  });

  const filteredEdges = data.edges.filter(edge => {
    const fromExists = filteredNodes.some(n => n.id === edge.from);
    const toExists = filteredNodes.some(n => n.id === edge.to);
    return fromExists && toExists;
  });

  return (
    <>
      {/* Render connections first (behind nodes) */}
      {filteredEdges.map((edge, index) => {
        const fromNode = filteredNodes.find(n => n.id === edge.from);
        const toNode = filteredNodes.find(n => n.id === edge.to);
        
        if (!fromNode || !toNode) return null;
        
        return (
          <ConnectionLine
            key={`edge-${index}`}
            start={fromNode.position}
            end={toNode.position}
            strength={edge.strength}
            type={edge.type}
          />
        );
      })}
      
      {/* Render nodes */}
      {filteredNodes.map((node) => (
        <GraphNode
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          onSelect={onNodeSelect}
        />
      ))}
    </>
  );
}

function NodeDetails({ node }: { node: GraphNode | null }) {
  if (!node) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </CardTitle>
          <CardDescription>
            Select a node to view detailed information
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'evidence': return <FileText className="h-4 w-4" />;
      case 'legal_authority': return <Scale className="h-4 w-4" />;
      case 'case_pattern': return <Users className="h-4 w-4" />;
      case 'strategy': return <BookOpen className="h-4 w-4" />;
      default: return <Network className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getIcon(node.type)}
          {node.title}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline" className="capitalize">
            {node.type.replace('_', ' ')}
          </Badge>
          {node.strength && (
            <Badge variant="secondary">
              Strength: {Math.round(node.strength * 100)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {node.metadata && (
            <div className="space-y-2">
              {Object.entries(node.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="font-medium capitalize">
                    {key.replace('_', ' ')}:
                  </span>
                  <span className="text-muted-foreground">
                    {typeof value === 'object' 
                      ? JSON.stringify(value).substring(0, 50) + '...'
                      : String(value).substring(0, 50)
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-sm">
            <span className="font-medium">Connections:</span>
            <span className="ml-2 text-muted-foreground">
              {node.connections.length} linked entities
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PersonalKnowledgeGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();

  const loadUserKnowledgeGraph = async () => {
    try {
      setLoading(true);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('No authenticated user');

      // Load user's evidence files
      const { data: files } = await supabase
        .from('files')
        .select('id, name, category, created_at')
        .eq('user_id', user.id)
        .eq('status', 'processed');

      // Load evidence-legal connections
      const { data: connections } = await supabase
        .from('evidence_legal_connections')
        .select(`
          id,
          relevance_score,
          connection_type,
          explanation,
          legal_sections!inner(
            id,
            title,
            content,
            legal_documents!inner(title, document_type)
          )
        `)
        .eq('user_id', user.id);

      // Load case patterns
      const { data: patterns } = await supabase
        .from('case_patterns')
        .select('*')
        .eq('user_id', user.id);

      // Load legal strategy
      const { data: strategy } = await supabase
        .from('legal_strategy')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const nodes: GraphNode[] = [];
      const edges: Array<{ from: string; to: string; strength: number; type: string }> = [];

      // Create evidence nodes
      files?.forEach((file, index) => {
        const angle = (index / (files.length || 1)) * Math.PI * 2;
        const radius = 3;
        nodes.push({
          id: `evidence-${file.id}`,
          type: 'evidence',
          title: file.name,
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle * 0.5),
            Math.sin(angle) * radius
          ],
          connections: connections?.filter(c => c.legal_sections)?.map(c => `legal-${c.legal_sections.id}`) || [],
          metadata: {
            category: file.category,
            created: file.created_at
          }
        });
      });

      // Create legal authority nodes
      connections?.forEach((conn, index) => {
        if (!conn.legal_sections) return;
        
        const existingNode = nodes.find(n => n.id === `legal-${conn.legal_sections.id}`);
        if (existingNode) return;

        const angle = ((index + (files?.length || 0)) / ((connections?.length || 1) + (files?.length || 0))) * Math.PI * 2;
        const radius = 4;
        
        nodes.push({
          id: `legal-${conn.legal_sections.id}`,
          type: 'legal_authority',
          title: conn.legal_sections.title,
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle * 0.3) + 1,
            Math.sin(angle) * radius
          ],
          connections: [`connection-${conn.id}`],
          metadata: {
            document: conn.legal_sections.legal_documents.title,
            type: conn.legal_sections.legal_documents.document_type
          },
          strength: conn.relevance_score
        });

        // Create connection edges
        const evidenceNode = nodes.find(n => n.type === 'evidence');
        if (evidenceNode) {
          edges.push({
            from: evidenceNode.id,
            to: `legal-${conn.legal_sections.id}`,
            strength: conn.relevance_score || 0.5,
            type: conn.connection_type || 'supporting_evidence'
          });
        }
      });

      // Create case pattern nodes
      patterns?.forEach((pattern, index) => {
        const angle = (index / (patterns.length || 1)) * Math.PI * 2 + Math.PI;
        const radius = 2.5;
        
        nodes.push({
          id: `pattern-${pattern.id}`,
          type: 'case_pattern',
          title: pattern.description.substring(0, 30) + '...',
          position: [
            Math.cos(angle) * radius,
            -1 + Math.sin(angle * 0.2),
            Math.sin(angle) * radius
          ],
          connections: pattern.evidence_files || [],
          metadata: {
            type: pattern.pattern_type,
            strength: pattern.pattern_strength,
            significance: pattern.legal_significance
          },
          strength: pattern.pattern_strength
        });

        // Connect patterns to related evidence
        pattern.evidence_files?.forEach(fileId => {
          const evidenceNode = nodes.find(n => n.id === `evidence-${fileId}`);
          if (evidenceNode) {
            edges.push({
              from: `pattern-${pattern.id}`,
              to: evidenceNode.id,
              strength: pattern.pattern_strength || 0.5,
              type: 'case_strategy'
            });
          }
        });
      });

      // Create strategy node if exists
      if (strategy) {
        nodes.push({
          id: `strategy-${strategy.id}`,
          type: 'strategy',
          title: 'Legal Strategy',
          position: [0, 2, 0],
          connections: nodes.map(n => n.id),
          metadata: {
            overall_strength: strategy.case_strength_overall,
            strengths: Array.isArray(strategy.strengths) ? strategy.strengths.length : 0,
            weaknesses: Array.isArray(strategy.weaknesses) ? strategy.weaknesses.length : 0
          },
          strength: strategy.case_strength_overall
        });

        // Connect strategy to all other nodes with varying strengths
        nodes.forEach(node => {
          if (node.id !== `strategy-${strategy.id}`) {
            edges.push({
              from: `strategy-${strategy.id}`,
              to: node.id,
              strength: 0.3,
              type: 'case_strategy'
            });
          }
        });
      }

      setData({ nodes, edges });
      
    } catch (error) {
      console.error('Error loading knowledge graph:', error);
      toast({
        title: "Error",
        description: "Failed to load your personal knowledge graph",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserKnowledgeGraph();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading your knowledge graph...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Personal Knowledge Graph</h2>
          <p className="text-muted-foreground">
            Interactive visualization of your legal case landscape
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadUserKnowledgeGraph}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="3d" className="w-full">
        <TabsList>
          <TabsTrigger value="3d">3D Graph</TabsTrigger>
          <TabsTrigger value="details">Node Details</TabsTrigger>
        </TabsList>

        <TabsContent value="3d" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({data.nodes.length})
            </Button>
            <Button
              variant={filter === 'evidence' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('evidence')}
            >
              <FileText className="h-3 w-3 mr-1" />
              Evidence ({data.nodes.filter(n => n.type === 'evidence').length})
            </Button>
            <Button
              variant={filter === 'legal_authority' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('legal_authority')}
            >
              <Scale className="h-3 w-3 mr-1" />
              Legal ({data.nodes.filter(n => n.type === 'legal_authority').length})
            </Button>
            <Button
              variant={filter === 'case_pattern' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('case_pattern')}
            >
              <Users className="h-3 w-3 mr-1" />
              Patterns ({data.nodes.filter(n => n.type === 'case_pattern').length})
            </Button>
            <Button
              variant={filter === 'strategy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('strategy')}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Strategy ({data.nodes.filter(n => n.type === 'strategy').length})
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div style={{ height: '600px' }}>
                    <Canvas camera={{ position: [8, 5, 8], fov: 60 }}>
                      <Suspense fallback={null}>
                        <ambientLight intensity={0.4} />
                        <directionalLight 
                          position={[10, 10, 5]} 
                          intensity={1}
                          castShadow
                        />
                        <pointLight position={[-10, -10, -5]} intensity={0.5} />
                        
                        <Graph3D
                          data={data}
                          selectedNode={selectedNode}
                          onNodeSelect={setSelectedNode}
                          filter={filter}
                        />
                        
                        <OrbitControls 
                          enablePan={true}
                          enableZoom={true}
                          enableRotate={true}
                          minDistance={3}
                          maxDistance={20}
                        />
                      </Suspense>
                    </Canvas>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <NodeDetails node={selectedNode} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="grid gap-4">
            {data.nodes.map((node) => (
              <Card key={node.id} className={selectedNode?.id === node.id ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{node.title}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {node.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Connections: {node.connections.length}</div>
                    {node.strength && (
                      <div>Strength: {Math.round(node.strength * 100)}%</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}