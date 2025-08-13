import { SEO } from "@/components/SEO";

export default function Taskboard() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Taskboard | NSW Legal Evidence Manager" description="Track tasks and next steps for your case." />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Taskboard</h1>
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Coming soon. Plan, assign, and track actions for your case.
      </div>
    </div>
  );
}
