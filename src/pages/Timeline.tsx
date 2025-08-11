import { SEO } from "@/components/SEO";

export default function Timeline() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Timeline | NSW Legal Evidence Manager" description="Extract and manage dated events, link evidence, and export a court-ready chronology." />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Timeline</h1>
      <p className="text-muted-foreground">Auto-extracted events will appear here. Edit, filter, and export.</p>
      <div className="mt-6 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Coming soon. Connect Supabase to enable processing and extraction.
      </div>
    </div>
  );
}
