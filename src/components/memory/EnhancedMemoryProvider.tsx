import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EnhancedMemoryContextType {
  isMemoryEnabled: boolean;
  vectorSearchActive: boolean;
  proactiveTriggersActive: boolean;
  caseStrengthMonitoring: boolean;
  toggleMemoryFeature: (feature: keyof Omit<EnhancedMemoryContextType, 'toggleMemoryFeature'>) => void;
  announceMemoryUpdate: (message: string) => void;
}

const EnhancedMemoryContext = createContext<EnhancedMemoryContextType>({
  isMemoryEnabled: true,
  vectorSearchActive: true,
  proactiveTriggersActive: true,
  caseStrengthMonitoring: true,
  toggleMemoryFeature: () => {},
  announceMemoryUpdate: () => {},
});

export const useEnhancedMemoryContext = () => useContext(EnhancedMemoryContext);

interface EnhancedMemoryProviderProps {
  children: ReactNode;
}

export function EnhancedMemoryProvider({ children }: EnhancedMemoryProviderProps) {
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(true);
  const [vectorSearchActive, setVectorSearchActive] = useState(true);
  const [proactiveTriggersActive, setProactiveTriggersActive] = useState(true);
  const [caseStrengthMonitoring, setCaseStrengthMonitoring] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load memory settings from localStorage or user preferences
    const memorySettings = localStorage.getItem('enhanced-memory-settings');
    if (memorySettings) {
      try {
        const settings = JSON.parse(memorySettings);
        setIsMemoryEnabled(settings.isMemoryEnabled ?? true);
        setVectorSearchActive(settings.vectorSearchActive ?? true);
        setProactiveTriggersActive(settings.proactiveTriggersActive ?? true);
        setCaseStrengthMonitoring(settings.caseStrengthMonitoring ?? true);
      } catch (error) {
        console.error("Failed to load memory settings:", error);
      }
    }
  }, []);

  const toggleMemoryFeature = (feature: keyof Omit<EnhancedMemoryContextType, 'toggleMemoryFeature' | 'announceMemoryUpdate'>) => {
    const setters = {
      isMemoryEnabled: setIsMemoryEnabled,
      vectorSearchActive: setVectorSearchActive,
      proactiveTriggersActive: setProactiveTriggersActive,
      caseStrengthMonitoring: setCaseStrengthMonitoring,
    };

    const setter = setters[feature];
    if (setter) {
      setter(prev => {
        const newValue = !prev;
        
        // Save settings to localStorage
        const currentSettings = {
          isMemoryEnabled,
          vectorSearchActive,
          proactiveTriggersActive,
          caseStrengthMonitoring,
          [feature]: newValue,
        };
        localStorage.setItem('enhanced-memory-settings', JSON.stringify(currentSettings));
        
        toast({
          title: `Enhanced Memory: ${feature} ${newValue ? 'Enabled' : 'Disabled'}`,
          description: `${feature.replace(/([A-Z])/g, ' $1').toLowerCase()} feature ${newValue ? 'activated' : 'deactivated'}`,
        });
        
        return newValue;
      });
    }
  };

  const announceMemoryUpdate = (message: string) => {
    if (isMemoryEnabled) {
      toast({
        title: "🧠 Enhanced Memory Update",
        description: message,
        duration: 4000,
      });
    }
  };

  const contextValue: EnhancedMemoryContextType = {
    isMemoryEnabled,
    vectorSearchActive,
    proactiveTriggersActive,
    caseStrengthMonitoring,
    toggleMemoryFeature,
    announceMemoryUpdate,
  };

  return (
    <EnhancedMemoryContext.Provider value={contextValue}>
      {children}
    </EnhancedMemoryContext.Provider>
  );
}