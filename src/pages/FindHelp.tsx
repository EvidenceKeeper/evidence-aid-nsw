import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FindHelp() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Find Help (NSW) | NSW Legal Evidence Manager" description="Find NSW resources: pro-bono lawyers, paid lawyers, courts, Legal Aid, DV services, police LACs." />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Find Help (NSW)</h1>
      <p className="text-muted-foreground mb-6">Search pro-bono and paid lawyers, courts, Legal Aid, DV services, and police stations.</p>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border bg-card p-6">
          <h2 className="font-medium mb-2">Pro-bono Lawyers</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li><a className="underline hover:text-primary" href="https://www.justiceconnect.org.au/" target="_blank" rel="noreferrer">Justice Connect</a></li>
            <li><a className="underline hover:text-primary" href="https://www.lawaccess.nsw.gov.au/" target="_blank" rel="noreferrer">LawAccess NSW</a></li>
            <li><a className="underline hover:text-primary" href="https://www.legalaid.nsw.gov.au/" target="_blank" rel="noreferrer">Legal Aid NSW</a></li>
          </ul>
        </article>

        <article className="rounded-lg border bg-card p-6">
          <h2 className="font-medium mb-2">Paid Lawyers</h2>
          <p className="text-sm text-muted-foreground">Enter postcode to search NSW paid lawyers (Google Places).</p>
          <div className="mt-3 flex gap-2">
            <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g., 2000" />
            <Button onClick={() => toast.info("Connect Supabase to enable Places search.")}>Search</Button>
          </div>
        </article>

        <article className="rounded-lg border bg-card p-6">
          <h2 className="font-medium mb-2">Courts & Services</h2>
          <p className="text-sm text-muted-foreground">Nearest court, Legal Aid NSW, DV supports will be listed here.</p>
        </article>

        <article className="rounded-lg border bg-card p-6">
          <h2 className="font-medium mb-2">Police stations / LACs</h2>
          <p className="text-sm text-muted-foreground">Enter postcode to find nearby stations.</p>
        </article>
      </section>
    </div>
  );
}
