import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LiveCaseTimeline } from "@/components/timeline/LiveCaseTimeline";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CaseIntelligenceProvider } from "@/components/realtime/CaseIntelligenceProvider";
import { LegalTrainingLink } from "@/components/legal/LegalTrainingLink";
import { CasePlanOnboarding } from "@/components/onboarding/CasePlanOnboarding";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LawyerChat() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: caseMemory } = await supabase
          .from('case_memory')
          .select('id, active_case_plan_id')
          .eq('user_id', user.id)
          .single();

        // Show onboarding if no active case plan
        setShowOnboarding(!caseMemory?.active_case_plan_id);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your legal assistant...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <CasePlanOnboarding 
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <CaseIntelligenceProvider>
      <div className="h-screen bg-background p-1 md:p-2">
        <SEO 
          title="Lawyer Chat | NSW Legal Evidence Manager" 
          description="Chat with your AI legal assistant while monitoring real-time case progress and analysis." 
        />
        
        {isMobile ? (
          // Mobile: Stack vertically with collapsible timeline
          <div className="h-[calc(100vh-0.5rem)] flex flex-col rounded-lg overflow-hidden border border-border/20 shadow-md">
            <div className="flex items-center justify-between p-2 border-b border-border/20 bg-background/80">
              <LegalTrainingLink />
              <button 
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                onClick={() => {/* TODO: Toggle timeline */}}
              >
                Timeline
              </button>
            </div>
            
            <div className="flex-1 min-h-0">
              <ErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Chat Temporarily Unavailable</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      An error occurred while loading the chat interface.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                      Refresh Page
                    </Button>
                  </div>
                }
              >
                <ChatInterface />
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          // Desktop: Side-by-side resizable layout
          <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-1rem)] rounded-lg overflow-hidden border border-border/20 shadow-md">
            {/* Chat Interface (Left) */}
            <ResizablePanel defaultSize={80} minSize={50} maxSize={85}>
              <div className="flex items-center justify-between p-2 border-b border-border/20 bg-background/80">
                <LegalTrainingLink />
              </div>
              <div className="h-[calc(100%-3rem)]">
                <ErrorBoundary
                  fallback={
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Chat Temporarily Unavailable</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        An error occurred while loading the chat interface.
                      </p>
                      <Button onClick={() => window.location.reload()}>
                        Refresh Page
                      </Button>
                    </div>
                  }
                >
                  <ChatInterface />
                </ErrorBoundary>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Live Timeline (Right) */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={50}>
              <div className="h-full border-l border-border/20 p-2">
                <LiveCaseTimeline />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </CaseIntelligenceProvider>
  );
}