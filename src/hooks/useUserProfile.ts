import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  communication_style?: 'concise' | 'detailed' | 'balanced';
  experience_level?: 'first_time' | 'some_experience' | 'experienced';
  name?: string;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>({
    communication_style: 'concise',
    experience_level: 'first_time'
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: caseMemory } = await supabase
        .from('case_memory')
        .select('personalization_profile')
        .eq('user_id', user.id)
        .single();

      if (caseMemory?.personalization_profile && typeof caseMemory.personalization_profile === 'object') {
        setProfile(caseMemory.personalization_profile as UserProfile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newProfile = { ...profile, ...updates };
      
      const { error } = await supabase
        .from('case_memory')
        .upsert({
          user_id: user.id,
          personalization_profile: newProfile,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setProfile(newProfile);
      
      toast({
        title: 'Preferences updated',
        description: 'Your AI assistant will adapt to your new preferences',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Update failed',
        description: 'Could not save preferences',
        variant: 'destructive'
      });
    }
  };

  return {
    profile,
    updateProfile,
    isLoading
  };
}
