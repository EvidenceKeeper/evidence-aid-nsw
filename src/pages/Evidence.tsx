import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { name: "Police report", color: "bg-[hsl(var(--category-police))]/15 text-[hsl(var(--category-police))]" },
  { name: "Court order/filing", color: "bg-[hsl(var(--category-court))]/15 text-[hsl(var(--category-court))]" },
  { name: "Message/email", color: "bg-[hsl(var(--category-message))]/15 text-[hsl(var(--category-message))]" },
  { name: "Photo/video", color: "bg-[hsl(var(--category-photo))]/15 text-[hsl(var(--category-photo))]" },
  { name: "Medical", color: "bg-[hsl(var(--category-medical))]/15 text-[hsl(var(--category-medical))]" },
  { name: "Financial", color: "bg-[hsl(var(--category-financial))]/15 text-[hsl(var(--category-financial))]" },
  { name: "Witness", color: "bg-[hsl(var(--category-witness))]/15 text-[hsl(var(--category-witness))]" },
  { name: "Other", color: "bg-[hsl(var(--category-other))]/15 text-[hsl(var(--category-other))]" },
];

export default function Evidence() {
  const onDrop = useCallback(async (files: File[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please log in to upload securely.");
        return;
      }

      const userId = session.user.id;
      const results = await Promise.all(
        files.map(async (file) => {
          const path = `${userId}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from("evidence").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
          });
          if (error) {
            console.error("Upload failed:", file.name, error);
            return { ok: false, name: file.name };
          }
          return { ok: true, name: file.name, path };
        })
      );

      const success = results.filter((r) => r.ok).length;
      const failed = results.length - success;
      if (success) toast.success(`Uploaded ${success} file(s).`);
      if (failed) toast.error(`Failed to upload ${failed} file(s).`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Unexpected upload error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Evidence Hub | NSW Legal Evidence Manager" description="Upload, organize, and preview documents. Auto-categorize and manage tags in a clean evidence grid." />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Evidence</h1>
        <p className="text-muted-foreground">Upload PDFs, images, emails, audio/video. Categorize, tag, and preview.</p>
      </header>

      <section
        {...getRootProps()}
        className="border border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop files to upload securely.</p>
        ) : (
          <p>Drag and drop files here, or click to select. You must be logged in.</p>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <span key={c.name} className={`px-2 py-1 text-xs rounded-full ${c.color}`}>{c.name}</span>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <article key={i} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="h-36 rounded-md bg-muted/40 mb-3" />
              <div className="h-4 bg-muted/60 rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted/40 rounded w-1/2" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
