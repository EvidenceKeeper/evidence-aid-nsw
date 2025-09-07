import { useState, useEffect } from 'react';

export interface WellnessSettings {
  // Privacy & Safety
  enableWellnessFront: boolean;
  enablePanicButton: boolean;
  enableAutoLogout: boolean;
  autoLogoutMinutes: number;
  enableHistoryClearing: boolean;
  emergencyRedirectUrl: string;
  
  // Wellness Camouflage
  wellnessTheme: 'meditation' | 'fitness' | 'journaling' | 'mentalhealth';
  accessMethod: 'triple-click' | 'keyword' | 'sequence' | 'timer';
  customKeyword: string;
  
  // Emergency Features
  panicKeyCombo: string;
  quickExitEnabled: boolean;
  sessionWarnings: boolean;
}

const defaultSettings: WellnessSettings = {
  enableWellnessFront: true,
  enablePanicButton: true,
  enableAutoLogout: true,
  autoLogoutMinutes: 30,
  enableHistoryClearing: true,
  emergencyRedirectUrl: 'https://www.google.com/search?q=mental+health+resources',
  wellnessTheme: 'mentalhealth',
  accessMethod: 'triple-click',
  customKeyword: 'breathe',
  panicKeyCombo: 'Escape',
  quickExitEnabled: true,
  sessionWarnings: true,
};

const STORAGE_KEY = 'wellness-settings';

export function useWellnessSettings() {
  const [settings, setSettings] = useState<WellnessSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load wellness settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = (newSettings: Partial<WellnessSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save wellness settings:', error);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string) => {
    try {
      const imported = JSON.parse(settingsJson);
      updateSettings(imported);
      return true;
    } catch (error) {
      console.warn('Failed to import settings:', error);
      return false;
    }
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    isLoading,
  };
}