import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, FileText, Scale, Link, TrendingUp, TrendingDown, Info, BookOpen } from 'lucide-react';

interface EvidenceConnection {
  id: string;
  connection_type: string;
  relevance_score: number;
  explanation: string;
  evidence_file: {
    id: string;
    name: string;
  };
  legal_section: {
    id: string;
    title: string;
    citation_format: string;
    content: string;
    legal_documents: {
      title: string;
      document_type: string;
      jurisdiction: string;
    };
  };
}

interface EvidenceConnectionsProps {
  fileId?: string;
  legalSectionId?: string;
  className?: string;
}

export default function EvidenceConnections({ 
  fileId, 
  legalSectionId, 
  className = '' 
}: EvidenceConnectionsProps) {
  const [connections, setConnections] = useState<EvidenceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConnections();
  }, [fileId, legalSectionId]);

  const fetchConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('evidence_legal_connections')
        .select(`
          id,
          connection_type,
          relevance_score,
          explanation,
          evidence_file:files!evidence_file_id(
            id,
            name
          ),
          legal_section:legal_sections!legal_section_id(
            id,
            title,
            citation_format,
            content,
            legal_documents!inner(
              title,
              document_type,
              jurisdiction
            )
          )
        `)
        .eq('user_id', user.id)
        .order('relevance_score', { ascending: false });

      if (fileId) {
        query = query.eq('evidence_file_id', fileId);
      }

      if (legalSectionId) {
        query = query.eq('legal_section_id', legalSectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching evidence connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (connectionId: string) => {
    const newExpanded = new Set(expandedConnections);
    if (newExpanded.has(connectionId)) {
      newExpanded.delete(connectionId);
    } else {
      newExpanded.add(connectionId);
    }
    setExpandedConnections(newExpanded);
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'supports':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'contradicts':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'explains':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'precedent':
        return <Scale className="h-4 w-4 text-purple-600" />;
      case 'requirement':
        return <BookOpen className="h-4 w-4 text-orange-600" />;
      default:
        return <Link className="h-4 w-4 text-gray-600" />;
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'supports':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'contradicts':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'explains':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'precedent':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'requirement':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Link className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No evidence connections found. Upload evidence files and enable evidence integration to see connections.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Link className="h-5 w-5" />
          <span>Evidence Connections</span>
        </CardTitle>
        <CardDescription>
          How your evidence relates to legal knowledge
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {connections.map((connection) => (
          <div key={connection.id} className="border rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getConnectionIcon(connection.connection_type)}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getConnectionColor(connection.connection_type)}`}
                  >
                    {connection.connection_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <span className={getRelevanceColor(connection.relevance_score)}>
                      {Math.round(connection.relevance_score * 100)}% relevance
                    </span>
                  </Badge>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(connection.id)}
                  className="h-6 w-6 p-0"
                >
                  {expandedConnections.has(connection.id) ? 
                    <ChevronUp className="h-3 w-3" /> : 
                    <ChevronDown className="h-3 w-3" />
                  }
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {connection.evidence_file.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Scale className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {connection.legal_section.title}
                    </p>
                    {connection.legal_section.citation_format && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {connection.legal_section.citation_format}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {connection.explanation}
                </p>
              </div>

              <Collapsible open={expandedConnections.has(connection.id)}>
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">
                        Legal Document
                      </h5>
                      <p className="text-sm">
                        {connection.legal_section.legal_documents.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {connection.legal_section.legal_documents.document_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {connection.legal_section.legal_documents.jurisdiction}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">
                        Legal Content Preview
                      </h5>
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {connection.legal_section.content.substring(0, 200)}
                        {connection.legal_section.content.length > 200 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}