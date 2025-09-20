import { SEO } from "@/components/SEO";

export default function Workspace() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Case Workspace | NSW Legal Evidence Manager" description="Organize files, see health status, and access quick actions for your case." />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Case Workspace</h1>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium mb-2">Quick links</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Go to Library to upload files</li>
            <li>Open Chat to ask about your case</li>
            <li>Build a Timeline from your evidence</li>
          </ul>
        </article>
        <article className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium mb-2">Status</h2>
          <p className="text-sm text-muted-foreground">Processing and tools will appear here soon.</p>
        </article>
      </section>
    </div>
  );
}
