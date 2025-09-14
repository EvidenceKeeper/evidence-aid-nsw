import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  Image, 
  Video, 
  FileAudio, 
  File,
  Link,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface EvidenceConnection {
  file_name: string;
  connection_type: string;
  explanation: string;
  relevance_score: number;
  file_category?: string;
}

interface EvidenceConnectionsProps {
  connections: EvidenceConnection[];
}

export default function EvidenceConnections({ connections }: EvidenceConnectionsProps) {
  if (!connections || connections.length === 0) {
    return null;
  }

  const getFileIcon = (fileName: string, category?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (category === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-3 w-3" />;
    }
    if (category === 'video' || ['mp4', 'avi', 'mov', 'mkv'].includes(extension || '')) {
      return <Video className="h-3 w-3" />;
    }
    if (category === 'audio' || ['mp3', 'wav', 'flac'].includes(extension || '')) {
      return <FileAudio className="h-3 w-3" />;
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return <FileText className="h-3 w-3" />;
    }
    return <File className="h-3 w-3" />;
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'direct_evidence':
        return <CheckCircle className="h-3 w-3" />;
      case 'supporting_evidence':
        return <Link className="h-3 w-3" />;
      case 'circumstantial_evidence':
        return <Clock className="h-3 w-3" />;
      case 'contradictory_evidence':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Link className="h-3 w-3" />;
    }
  };

  const getConnectionTypeColor = (type: string, relevance: number) => {
    const intensity = relevance > 0.7 ? 'strong' : relevance > 0.4 ? 'medium' : 'weak';
    
    switch (type.toLowerCase()) {
      case 'direct_evidence':
        return intensity === 'strong' 
          ? 'text-green-800 bg-green-100 border-green-300' 
          : 'text-green-700 bg-green-50 border-green-200';
      case 'supporting_evidence':
        return intensity === 'strong' 
          ? 'text-blue-800 bg-blue-100 border-blue-300' 
          : 'text-blue-700 bg-blue-50 border-blue-200';
      case 'circumstantial_evidence':
        return intensity === 'strong' 
          ? 'text-yellow-800 bg-yellow-100 border-yellow-300' 
          : 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'contradictory_evidence':
        return intensity === 'strong' 
          ? 'text-red-800 bg-red-100 border-red-300' 
          : 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-muted-foreground bg-muted border-muted';
    }
  };

  const formatConnectionType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="mt-2 border-l-4 border-l-blue-400 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link className="h-4 w-4" />
          Your Evidence Connections
        </CardTitle>
        <CardDescription className="text-xs">
          Your uploaded files related to this legal authority
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="space-y-2">
            {connections.map((connection, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  {getFileIcon(connection.file_name, connection.file_category)}
                  <span className="text-xs font-medium truncate">
                    {connection.file_name}
                  </span>
                </div>
                
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      variant="outline" 
                      className={`text-xs cursor-help ${getConnectionTypeColor(connection.connection_type, connection.relevance_score)}`}
                    >
                      {getConnectionTypeIcon(connection.connection_type)}
                      <span className="ml-1">
                        {formatConnectionType(connection.connection_type)}
                      </span>
                      <span className="ml-1 text-xs opacity-70">
                        ({Math.round(connection.relevance_score * 100)}%)
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="text-sm">
                      <p className="font-medium">
                        {formatConnectionType(connection.connection_type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {connection.explanation}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Relevance: {Math.round(connection.relevance_score * 100)}%
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}