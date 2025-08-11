import { SEO } from "@/components/SEO";

export default function Assistant() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Legal Assistant | NSW Legal Evidence Manager" description="Ask grounded questions about your documents and NSW sources with citations." />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Legal Assistant</h1>
      <p className="text-muted-foreground">Chat will appear here. Answers will cite your documents and NSW sources.</p>
    </div>
  );
}
