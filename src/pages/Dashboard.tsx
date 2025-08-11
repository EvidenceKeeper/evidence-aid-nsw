import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="relative overflow-hidden">
      <SEO
        title="NSW Legal Evidence Manager | Guided Assistant"
        description="Upload, organize, and use your legal evidence for AVO and Family Court matters in NSW. Secure, private, and easy to use."
      />
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Organize and use your legal evidence with confidence
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-8">
            Built for NSW AVO and Family Court matters. Upload documents, get
            summaries, build timelines, and ask the assistant questions grounded
            in your files.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/evidence">
              <Button size="lg">Go to Evidence</Button>
            </Link>
            <a
              href="https://docs.lovable.dev/integrations/supabase/"
              target="_blank"
              rel="noreferrer"
            >
              <Button size="lg" variant="secondary">Connect Supabase</Button>
            </a>
          </div>
        </div>
      </section>
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]">
        <div className="absolute -top-24 left-1/2 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,theme(colors.primary.DEFAULT),transparent)] blur-3xl" />
      </div>
    </div>
  );
}
