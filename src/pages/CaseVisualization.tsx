import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CaseVisualizationPanel } from "@/components/visualization/CaseVisualizationPanel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function CaseVisualization() {
  const [activeView, setActiveView] = useState<"timeline" | "mindmap" | "evidence-web" | "patterns">("timeline");

  return (
      <div className="h-screen bg-background p-2">
        <SEO 
          title="Case Visualization | NSW Legal Evidence Manager" 
          description="Advanced AI-powered visualization of your legal case with timeline, evidence mapping, and pattern analysis." 
        />
        
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-1rem)] rounded-lg overflow-hidden border border-border/20 shadow-md">
        {/* Visualization Panel (Left) */}
        <ResizablePanel defaultSize={65} minSize={50} maxSize={80}>
          <div className="h-full p-2">
            <CaseVisualizationPanel 
              activeView={activeView} 
              onViewChange={setActiveView}
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Chat Panel (Right) */}
        <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
          <div className="h-full border-l border-border/20 p-2">
            <ChatInterface />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
  );
}