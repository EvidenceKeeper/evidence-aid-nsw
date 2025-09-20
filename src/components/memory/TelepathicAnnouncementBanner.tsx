import React from 'react';
import { X, Clock, AlertTriangle, Upload, BarChart3, Calendar, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTelepathicContext } from './TelepathicContextProvider';

interface TelepathicAnnouncementBannerProps {
  className?: string;
}

export function TelepathicAnnouncementBanner({ className }: TelepathicAnnouncementBannerProps) {
  const { announcements, dismissAnnouncement } = useTelepathicContext();

  if (announcements.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'evidence_processed': return <Upload className="h-4 w-4" />;
      case 'case_strength_update': return <BarChart3 className="h-4 w-4" />;
      case 'timeline_update': return <Calendar className="h-4 w-4" />;
      case 'contradiction_alert': return <AlertTriangle className="h-4 w-4" />;
      case 'email_corpus': return <Mail className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case 'contradiction_alert': return 'destructive';
      case 'case_strength_update': return 'default';
      case 'evidence_processed': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {announcements.map((announcement, index) => (
        <Card key={index} className="border-l-4 border-l-primary animate-in slide-in-from-top-2 duration-300">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {getIcon(announcement.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getVariant(announcement.type)} className="text-xs">
                      {announcement.title}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {announcement.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  {announcement.action && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => {
                        // Handle action click - this could trigger specific behaviors
                        console.log(`Action clicked: ${announcement.action}`);
                      }}
                    >
                      {announcement.action}
                    </Button>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => dismissAnnouncement(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}