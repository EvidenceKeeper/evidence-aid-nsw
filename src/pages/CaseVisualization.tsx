import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CaseVisualizationPanel } from "@/components/visualization/CaseVisualizationPanel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function CaseVisualization() {
  const [activeView, setActiveView] = useState<"timeline" | "mindmap" | "evidence-web" | "patterns">("timeline");

  return (
    <div className="h-screen bg-background">
      <SEO 
        title="Case Visualization | NSW Legal Evidence Manager" 
        description="Advanced AI-powered visualization of your legal case with timeline, evidence mapping, and pattern analysis." 
      />
      
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Visualization Panel (Left) */}
        <ResizablePanel defaultSize={65} minSize={50} maxSize={80}>
          <CaseVisualizationPanel 
            activeView={activeView} 
            onViewChange={setActiveView}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Chat Panel (Right) */}
        <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
          <div className="h-full border-l border-border">
            <ChatInterface />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}