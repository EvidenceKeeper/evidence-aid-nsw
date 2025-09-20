import React, { useState, useEffect } from 'react';
import { Network, Link, Eye, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTelepathicContext } from './TelepathicContextProvider';
import { supabase } from '@/integrations/supabase/client';

interface EvidenceConnection {
  id: string;
  sourceFile: string;
  targetFile: string;
  connectionType: 'temporal' | 'thematic' | 'contradictory' | 'supporting';
  strength: number; // 0-1
  description: string;
  auto_detected: boolean;
}

export function EvidenceRelationshipMatrix() {
  const { telepathicMode } = useTelepathicContext();
  const [connections, setConnections] = useState<EvidenceConnection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (telepathicMode) {
      loadEvidenceConnections();
    }
  }, [telepathicMode]);

  const loadEvidenceConnections = async () => {
    setLoading(true);
    try {
      const { data: relationships } = await supabase
        .from('evidence_relationships')
        .select(`
          id,
          relationship_type,
          description,
          confidence,
          created_at,
          source_file_id,
          target_file_id
        `)
        .order('confidence', { ascending: false })
        .limit(5);

      if (relationships) {
        // Get file names separately
        const fileIds = [...new Set([
          ...relationships.map(r => r.source_file_id),
          ...relationships.map(r => r.target_file_id)
        ])];

        const { data: files } = await supabase
          .from('files')
          .select('id, name')
          .in('id', fileIds);

        const fileMap = new Map(files?.map(f => [f.id, f.name]) || []);

        const connections: EvidenceConnection[] = relationships.map(rel => ({
          id: rel.id,
          sourceFile: fileMap.get(rel.source_file_id) || 'Unknown',
          targetFile: fileMap.get(rel.target_file_id) || 'Unknown',
          connectionType: rel.relationship_type as any,
          strength: rel.confidence,
          description: rel.description || '',
          auto_detected: true
        }));
        setConnections(connections);
      }
    } catch (error) {
      console.error('Error loading evidence connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'supporting': return 'bg-success/10 text-success border-success/20';
      case 'contradictory': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'temporal': return 'bg-primary/10 text-primary border-primary/20';
      case 'thematic': return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'contradictory': return <AlertCircle className="h-3 w-3" />;
      default: return <Link className="h-3 w-3" />;
    }
  };

  if (!telepathicMode || connections.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4 text-primary" />
          Evidence Relationships
          <Badge variant="secondary" className="text-xs">
            {connections.length} detected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="flex items-start justify-between p-3 rounded-lg bg-card/50 border border-border/50"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getConnectionColor(connection.connectionType)}`}
                >
                  {getConnectionIcon(connection.connectionType)}
                  {connection.connectionType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(connection.strength * 100)}% confidence
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="truncate">
                  <span className="text-muted-foreground">From:</span> {connection.sourceFile}
                </div>
                <div className="truncate">
                  <span className="text-muted-foreground">To:</span> {connection.targetFile}
                </div>
              </div>
              
              {connection.description && (
                <p className="text-xs text-muted-foreground">{connection.description}</p>
              )}
            </div>
            
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        {loading && (
          <div className="text-center py-2">
            <div className="text-xs text-muted-foreground">Analyzing relationships...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}