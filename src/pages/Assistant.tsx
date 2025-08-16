import { SEO } from "@/components/SEO";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function Assistant() {
  return (
    <div className="h-full">
      <SEO 
        title="NSW Coercive Control Legal Assistant | Evidence Manager" 
        description="Specialized NSW legal assistant for coercive control cases with evidence analysis and legal guidance." 
      />
      <ChatInterface />
    </div>
  );
}