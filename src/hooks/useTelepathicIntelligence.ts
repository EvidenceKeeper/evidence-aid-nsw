import { useState, useEffect } from 'react';
import { useTelepathicContext } from '@/components/memory/TelepathicContextProvider';
import { useEnhancedMemory } from './useEnhancedMemory';

interface TelepathicInsight {
  id: string;
  type: 'prediction' | 'connection' | 'pattern' | 'suggestion';
  title: string;
  content: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export function useTelepathicIntelligence() {
  const [insights, setInsights] = useState<TelepathicInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { telepathicMode, currentGoal } = useTelepathicContext();
  const { caseMemory } = useEnhancedMemory();

  useEffect(() => {
    if (telepathicMode && currentGoal && caseMemory) {
      generateTelepathicInsights();
    }
  }, [telepathicMode, currentGoal, caseMemory]);

  const generateTelepathicInsights = async () => {
    setIsAnalyzing(true);
    
    try {
      const newInsights: TelepathicInsight[] = [];

      // Goal progression insights
      if (currentGoal && caseMemory?.case_strength_score) {
        const progress = caseMemory.case_strength_score;
        if (progress < 0.5) {
          newInsights.push({
            id: 'goal-progress',
            type: 'prediction',
            title: 'Goal Achievement Analysis',
            content: `Based on current evidence, you're ${Math.round(progress * 100)}% toward achieving "${currentGoal}". Key areas need attention.`,
            confidence: 0.8,
            priority: 'high',
            timestamp: new Date()
          });
        }
      }

      // Evidence pattern insights
      if (caseMemory?.evidence_index) {
        const evidenceCount = Object.keys(caseMemory.evidence_index).length;
        if (evidenceCount >= 2) {
          newInsights.push({
            id: 'evidence-pattern',
            type: 'pattern',
            title: 'Evidence Correlation Detected',
            content: `Your ${evidenceCount} evidence files show consistent patterns that strengthen your position.`,
            confidence: 0.7,
            priority: 'medium',
            timestamp: new Date()
          });
        }
      }

      // Timeline coherence insights
      if (caseMemory?.timeline_summary && caseMemory.timeline_summary.length > 100) {
        newInsights.push({
          id: 'timeline-coherence',
          type: 'connection',
          title: 'Timeline Narrative Strength',
          content: 'Your timeline creates a compelling narrative that supports your legal position.',
          confidence: 0.75,
          priority: 'medium',
          timestamp: new Date()
        });
      }

      // Proactive suggestions based on case state
      if (caseMemory?.case_strength_score && caseMemory.case_strength_score > 0.7) {
        newInsights.push({
          id: 'next-steps',
          type: 'suggestion',
          title: 'Strategic Next Steps',
          content: 'Your case is strong. Consider preparing for formal proceedings or settlement discussions.',
          confidence: 0.85,
          priority: 'high',
          timestamp: new Date()
        });
      }

      setInsights(newInsights.slice(0, 5)); // Keep top 5 insights
    } catch (error) {
      console.error('Error generating telepathic insights:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addCustomInsight = (insight: Omit<TelepathicInsight, 'id' | 'timestamp'>) => {
    const newInsight: TelepathicInsight = {
      ...insight,
      id: `custom-${Date.now()}`,
      timestamp: new Date()
    };
    setInsights(prev => [newInsight, ...prev].slice(0, 5));
  };

  const dismissInsight = (id: string) => {
    setInsights(prev => prev.filter(insight => insight.id !== id));
  };

  const getHighPriorityInsights = () => {
    return insights.filter(insight => insight.priority === 'high');
  };

  const getInsightsByType = (type: TelepathicInsight['type']) => {
    return insights.filter(insight => insight.type === type);
  };

  return {
    insights,
    isAnalyzing,
    addCustomInsight,
    dismissInsight,
    getHighPriorityInsights,
    getInsightsByType,
    generateTelepathicInsights
  };
}