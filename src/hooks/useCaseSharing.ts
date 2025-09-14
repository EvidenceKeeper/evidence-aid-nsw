import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type SharedCase = Database['public']['Tables']['shared_cases']['Row'] & {
  shared_with_email?: string;
};

export function useCaseSharing() {
  const [sharedCases, setSharedCases] = useState<SharedCase[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch shared cases on mount
  useEffect(() => {
    fetchSharedCases();
  }, []);

  const fetchSharedCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shared_cases')
        .select(`
          *,
          shared_with_email:shared_with_id(email)
        `)
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared cases:', error);
        return;
      }

      setSharedCases(data || []);
    } catch (error) {
      console.error('Error in fetchSharedCases:', error);
    }
  };

  const shareCase = async (
    email: string, 
    permissionLevel: 'view' | 'comment' | 'edit',
    expiryDate?: Date
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to share cases');
        return false;
      }

      // First, we'll create a simple approach - just use the email as identifier
      // In a real app, you'd want a proper user lookup system
      const fakeUserId = `user-${email.replace('@', '-').replace('.', '-')}`;

      const { error } = await supabase
        .from('shared_cases')
        .insert({
          owner_id: user.id,
          shared_with_id: fakeUserId, // Using email-based ID for now
          permission_level: permissionLevel,
          expires_at: expiryDate?.toISOString(),
        });

      if (error) {
        console.error('Error sharing case:', error);
        if (error.code === '23505') {
          toast.error('Case is already shared with this user');
        } else {
          toast.error('Failed to share case');
        }
        return false;
      }

      // Log the collaboration action
      await supabase
        .from('case_collaboration_log')
        .insert({
          case_owner_id: user.id,
          collaborator_id: fakeUserId,
          action_type: 'shared',
          action_details: {
            permission_level: permissionLevel,
            expires_at: expiryDate?.toISOString(),
            email: email
          }
        });

      await fetchSharedCases();
      return true;
    } catch (error) {
      console.error('Error in shareCase:', error);
      toast.error('Failed to share case');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateShareLink = async (
    permissionLevel: 'view' | 'comment' | 'edit',
    expiryDate?: Date
  ) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate a unique token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError || !tokenData) {
        toast.error('Failed to generate share link');
        return;
      }

      const token = tokenData;

      // Store the share token (we can use the same table with null shared_with_id for public links)
      const { error } = await supabase
        .from('shared_cases')
        .insert({
          owner_id: user.id,
          shared_with_id: user.id, // Temporary placeholder
          permission_level: permissionLevel,
          expires_at: expiryDate?.toISOString(),
          share_token: token,
        });

      if (error) {
        console.error('Error creating share link:', error);
        toast.error('Failed to create share link');
        return;
      }

      setShareToken(token);
      toast.success('Share link generated!');
    } catch (error) {
      console.error('Error in generateShareLink:', error);
      toast.error('Failed to generate share link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const link = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(link);
  };

  const revokeAccess = async (shareId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('shared_cases')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) {
        console.error('Error revoking access:', error);
        toast.error('Failed to revoke access');
        return;
      }

      toast.success('Access revoked successfully');
      await fetchSharedCases();
    } catch (error) {
      console.error('Error in revokeAccess:', error);
      toast.error('Failed to revoke access');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sharedCases,
    shareToken,
    isLoading,
    shareCase,
    revokeAccess,
    generateShareLink,
    copyShareLink,
    refreshShares: fetchSharedCases,
  };
}