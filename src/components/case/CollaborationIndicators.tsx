import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Collaborator {
  id: string;
  email: string;
  permission: 'view' | 'comment' | 'edit';
  isActive: boolean;
}

export function CollaborationIndicators() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeViewers, setActiveViewers] = useState(0);

  useEffect(() => {
    const fetchCollaborators = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch shared cases with user emails from auth.users
      const { data: shares } = await supabase
        .from('shared_cases')
        .select('id, shared_with_id, permission_level, is_active')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (shares && shares.length > 0) {
        const collabData: Collaborator[] = shares.map(share => ({
          id: share.shared_with_id,
          email: `User ${share.shared_with_id.substring(0, 8)}`,
          permission: share.permission_level as 'view' | 'comment' | 'edit',
          isActive: true
        }));

        setCollaborators(collabData);
      }
    };

    fetchCollaborators();
  }, []);

  if (collaborators.length === 0) return null;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'view': return 'text-blue-500';
      case 'comment': return 'text-yellow-500';
      case 'edit': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1.5">
                <Users className="h-3 w-3" />
                <span>{collaborators.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium text-sm">Collaborators:</p>
                {collaborators.map((collab) => (
                  <div key={collab.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(collab.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{collab.email}</span>
                    <span className={getPermissionColor(collab.permission)}>
                      ({collab.permission})
                    </span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {activeViewers > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1.5 animate-pulse">
                <Eye className="h-3 w-3" />
                <span>{activeViewers}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{activeViewers} viewing now</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
