import { SEO } from "@/components/SEO";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LiveCaseTimeline } from "@/components/timeline/LiveCaseTimeline";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CaseIntelligenceProvider } from "@/components/realtime/CaseIntelligenceProvider";

export default function LawyerChat() {
  return (
    <CaseIntelligenceProvider>
      <div className="h-screen bg-background p-2">
        <SEO 
          title="Lawyer Chat | NSW Legal Evidence Manager" 
          description="Chat with your AI legal assistant while monitoring real-time case progress and analysis." 
        />
        
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-1rem)] rounded-lg overflow-hidden border border-border/20 shadow-md">
          {/* Chat Interface (Left) */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <div className="h-full p-2">
              <ChatInterface />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Live Timeline (Right) */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <div className="h-full border-l border-border/20 p-2">
              <LiveCaseTimeline />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </CaseIntelligenceProvider>
  );
}