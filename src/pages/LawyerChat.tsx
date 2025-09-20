import { SEO } from "@/components/SEO";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LiveCaseTimeline } from "@/components/timeline/LiveCaseTimeline";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CaseIntelligenceProvider } from "@/components/realtime/CaseIntelligenceProvider";

export default function LawyerChat() {
  return (
    <CaseIntelligenceProvider>
      <div className="h-screen bg-background">
        <SEO 
          title="Lawyer Chat | NSW Legal Evidence Manager" 
          description="Chat with your AI legal assistant while monitoring real-time case progress and analysis." 
        />
        
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Chat Interface (Left) */}
          <ResizablePanel defaultSize={67} minSize={50} maxSize={80}>
            <div className="h-full">
              <ChatInterface />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Live Timeline (Right) */}
          <ResizablePanel defaultSize={33} minSize={20} maxSize={50}>
            <div className="h-full border-l border-border">
              <LiveCaseTimeline />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </CaseIntelligenceProvider>
  );
}