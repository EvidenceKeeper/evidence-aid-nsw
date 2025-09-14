import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  GitBranch, 
  ArrowRight, 
  ArrowLeft, 
  Scale, 
  FileText, 
  Gavel,
  Network,
  Link2
} from 'lucide-react';

interface Relationship {
  id: string;
  source_entity_type: string;
  target_entity_type: string;
  relationship_type: string;
  relationship_description?: string;
  relationship_strength: number;
  direction: 'incoming' | 'outgoing';
}

interface SearchResultRelationshipsProps {
  relationships: Relationship[];
  documentTitle: string;
}

export default function SearchResultRelationships({ 
  relationships, 
  documentTitle 
}: SearchResultRelationshipsProps) {
  if (!relationships || relationships.length === 0) {
    return null;
  }

  const getRelationshipIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cites':
      case 'cited_by':
        return <Gavel className="h-3 w-3" />;
      case 'amends':
      case 'amended_by':
        return <FileText className="h-3 w-3" />;
      case 'follows':
      case 'followed_by':
        return <ArrowRight className="h-3 w-3" />;
      case 'distinguishes':
      case 'distinguished_by':
        return <Scale className="h-3 w-3" />;
      case 'supersedes':
      case 'superseded_by':
        return <Link2 className="h-3 w-3" />;
      default:
        return <Network className="h-3 w-3" />;
    }
  };

  const getRelationshipColor = (type: string, strength: number) => {
    const baseClass = strength > 0.7 ? 'border-primary' : strength > 0.4 ? 'border-warning' : 'border-muted';
    
    switch (type.toLowerCase()) {
      case 'cites':
      case 'cited_by':
        return `${baseClass} text-blue-700 bg-blue-50`;
      case 'follows':
      case 'followed_by':
        return `${baseClass} text-green-700 bg-green-50`;
      case 'distinguishes':
      case 'distinguished_by':
        return `${baseClass} text-orange-700 bg-orange-50`;
      case 'supersedes':
      case 'superseded_by':
        return `${baseClass} text-red-700 bg-red-50`;
      default:
        return `${baseClass} text-muted-foreground bg-muted`;
    }
  };

  const incomingRels = relationships.filter(r => r.direction === 'incoming');
  const outgoingRels = relationships.filter(r => r.direction === 'outgoing');

  return (
    <Card className="mt-2 border-l-4 border-l-accent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Legal Relationships
        </CardTitle>
        <CardDescription className="text-xs">
          Connected legal authorities and precedents
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <TooltipProvider>
          {outgoingRels.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">This document references:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {outgoingRels.map((rel) => (
                  <Tooltip key={rel.id}>
                    <TooltipTrigger>
                      <Badge 
                        variant="outline" 
                        className={`text-xs cursor-help ${getRelationshipColor(rel.relationship_type, rel.relationship_strength)}`}
                      >
                        {getRelationshipIcon(rel.relationship_type)}
                        <span className="ml-1 capitalize">
                          {rel.relationship_type.replace('_', ' ')}
                        </span>
                        <span className="ml-1 text-xs opacity-70">
                          ({Math.round(rel.relationship_strength * 100)}%)
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">{rel.relationship_type.replace('_', ' ')}</p>
                        {rel.relationship_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {rel.relationship_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Strength: {Math.round(rel.relationship_strength * 100)}%
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {outgoingRels.length > 0 && incomingRels.length > 0 && (
            <Separator />
          )}

          {incomingRels.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Referenced by:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {incomingRels.map((rel) => (
                  <Tooltip key={rel.id}>
                    <TooltipTrigger>
                      <Badge 
                        variant="outline" 
                        className={`text-xs cursor-help ${getRelationshipColor(rel.relationship_type, rel.relationship_strength)}`}
                      >
                        {getRelationshipIcon(rel.relationship_type)}
                        <span className="ml-1 capitalize">
                          {rel.relationship_type.replace('_', ' ')}
                        </span>
                        <span className="ml-1 text-xs opacity-70">
                          ({Math.round(rel.relationship_strength * 100)}%)
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">{rel.relationship_type.replace('_', ' ')}</p>
                        {rel.relationship_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {rel.relationship_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Strength: {Math.round(rel.relationship_strength * 100)}%
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}