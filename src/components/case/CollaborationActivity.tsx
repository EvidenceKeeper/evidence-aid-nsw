import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Share2, MessageSquare, Edit, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Database } from '@/integrations/supabase/types';

type CollaborationLog = Database['public']['Tables']['case_collaboration_log']['Row'] & {
  collaborator_email?: string;
};

export function CollaborationActivity() {
  const [activities, setActivities] = useState<CollaborationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('case_collaboration_log')
        .select(`
          *,
          collaborator_email:collaborator_id(email)
        `)
        .eq('case_owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching collaboration activities:', error);
        return;
      }

      setActivities(data || []);
    } catch (error) {
      console.error('Error in fetchActivities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'shared': return <Share2 className="h-4 w-4" />;
      case 'commented': return <MessageSquare className="h-4 w-4" />;
      case 'edited': return <Edit className="h-4 w-4" />;
      case 'viewed': return <Eye className="h-4 w-4" />;
      case 'uploaded': return <FileText className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'shared': return 'default';
      case 'commented': return 'secondary';
      case 'edited': return 'destructive';
      case 'viewed': return 'outline';
      case 'uploaded': return 'default';
      default: return 'secondary';
    }
  };

  const getActivityDescription = (activity: CollaborationLog) => {
    const email = activity.collaborator_email || 'Unknown User';
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });
    const details = activity.action_details as any;

    switch (activity.action_type) {
      case 'shared':
        const permission = details?.permission_level || 'view';
        return `${email} was granted ${permission} access ${timeAgo}`;
      case 'commented':
        return `${email} added a comment ${timeAgo}`;
      case 'edited':
        const section = details?.section || 'case';
        return `${email} edited ${section} ${timeAgo}`;
      case 'viewed':
        return `${email} viewed the case ${timeAgo}`;
      case 'uploaded':
        const filename = details?.filename || 'a file';
        return `${email} uploaded ${filename} ${timeAgo}`;
      default:
        return `${email} performed an action ${timeAgo}`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Collaboration Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Collaboration Activity
        </CardTitle>
        <CardDescription>
          Recent activity on your shared cases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No collaboration activity yet</p>
              <p className="text-sm">Share your case to start collaborating</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex-shrink-0 mt-0.5">
                    <Badge variant={getActivityColor(activity.action_type)} className="h-8 w-8 rounded-full p-0 flex items-center justify-center">
                      {getActivityIcon(activity.action_type)}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {activity.action_type.charAt(0).toUpperCase() + activity.action_type.slice(1)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getActivityDescription(activity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}