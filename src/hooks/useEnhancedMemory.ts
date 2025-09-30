// Legacy compatibility - redirect to optimized memory
import { useOptimizedMemory } from './useOptimizedMemory';

// Legacy compatibility export - use useOptimizedMemory directly for new code
export function useEnhancedMemory() {
  return useOptimizedMemory();
}