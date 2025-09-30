// Legacy compatibility - redirect to unified memory system
import { useUnifiedMemory } from './UnifiedMemoryProvider';

// Re-export for backward compatibility
export function useTelepathicContext() {
  return useUnifiedMemory();
}

// Legacy component - functionality moved to UnifiedMemoryProvider
export function TelepathicContextProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}