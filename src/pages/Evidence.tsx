import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  type EvidenceItem = {
    name: string;
    path: string;
    size?: number;
    mimeType?: string;
    updated_at?: string;
    signedUrl?: string;
  };

  const [files, setFiles] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [indexing, setIndexing] = useState<string | null>(null);

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return "";
    const sizes = ["B", "KB", "MB", "GB"]; 
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < sizes.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
  };

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setFiles([]);
        setUserId(null);
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data: list, error } = await supabase.storage.from("evidence").list(uid, {
        limit: 100,
        sortBy: { column: "updated_at", order: "desc" },
      });
      if (error) {
        console.error("Failed to list files", error);
        toast.error("Failed to load files");
        setFiles([]);
        return;
      }

      const paths = (list ?? []).map((f) => `${uid}/${f.name}`);
      let signedMap: Record<string, string> = {};
      if (paths.length) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("evidence")
          .createSignedUrls(paths, 300);
        if (signErr) {
          console.error("Failed to sign URLs", signErr);
        } else if (signed) {
          signedMap = Object.fromEntries(signed.map((s) => [s.path, s.signedUrl]));
        }
      }

      const items: EvidenceItem[] = (list ?? []).map((f: any) => ({
        name: f.name,
        path: `${uid}/${f.name}`,
        size: f?.metadata?.size,
        mimeType: f?.metadata?.mimetype,
        updated_at: f?.updated_at,
        signedUrl: signedMap[`${uid}/${f.name}`],
      }));

      setFiles(items);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Unexpected error while loading files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onDrop = useCallback(async (dropped: File[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please log in to upload securely.");
        return;
      }

      const uid = session.user.id;
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB
      const allowed = [
        "application/pdf",
        "image/",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "audio/",
        "video/",
      ];
      const isAllowed = (type: string) => allowed.some((t) => (t.endsWith("/") ? type.startsWith(t) : type === t));

      const invalid = dropped.filter((f) => !isAllowed(f.type) || f.size > MAX_SIZE);
      if (invalid.length) {
        const names = invalid.map((f) => f.name).join(", ");
        toast.error(`Skipped ${invalid.length} invalid file(s): ${names}`);
      }

      const valid = dropped.filter((f) => !invalid.includes(f));
      if (!valid.length) return;

      const uploadWithRetry = async (file: File, attempts = 3) => {
        const path = `${uid}/${Date.now()}-${file.name}`;
        for (let i = 0; i < attempts; i++) {
          const { error } = await supabase.storage.from("evidence").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
          });
          if (!error) return { ok: true as const, name: file.name, path };
          if (i === attempts - 1) {
            console.error("Upload failed:", file.name, error);
            return { ok: false as const, name: file.name };
          }
          await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        }
        return { ok: false as const, name: file.name };
      };

      const results = await Promise.all(valid.map((file) => uploadWithRetry(file)));

      const success = results.filter((r) => r.ok).length;
      const failed = results.length - success;
      if (success) toast.success(`Uploaded ${success} file(s).`);
      if (failed) toast.error(`Failed to upload ${failed} file(s).`);

      await loadFiles();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Unexpected upload error");
    }
  }, [loadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 25 * 1024 * 1024,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'text/plain': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'audio/*': [],
      'video/*': [],
    },
  });

  const handleDelete = async (path: string) => {
    try {
      for (let i = 0; i < 2; i++) {
        const { error } = await supabase.storage.from("evidence").remove([path]);
        if (!error) {
          toast.success("File deleted");
          await loadFiles();
          return;
        }
        if (i === 1) {
          throw error;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to delete file");
    }
  };

  const handleIndexText = async (item: EvidenceItem) => {
    if (!item?.path) return;
    if (!item.mimeType?.startsWith("text/")) {
      toast.error("Only plain text files can be indexed in this step.");
      return;
    }
    try {
      setIndexing(item.path);
      // Refresh signed URL for safety
      const { data: signed, error: signErr } = await supabase.storage
        .from("evidence")
        .createSignedUrl(item.path, 300);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Failed to create signed URL");

      const res = await fetch(signed.signedUrl);
      if (!res.ok) throw new Error("Failed to fetch file content");
      const text = await res.text();

      const { data, error } = await supabase.functions.invoke("ingest-text", {
        body: {
          name: item.name,
          storage_path: item.path,
          mime_type: item.mimeType,
          size: item.size,
          text,
          meta: { source: "storage://evidence" },
        },
      });
      if (error) throw error;
      toast.success(`Indexed ${item.name}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Indexing failed");
    } finally {
      setIndexing(null);
    }
  };

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
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <article key={i} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="h-36 rounded-md bg-muted/40 mb-3" />
              <div className="h-4 bg-muted/60 rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted/40 rounded w-1/2" />
            </article>
          ))}

          {!loading && files.length === 0 && (
            <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
              No files yet. Upload above to get started.
            </div>
          )}

          {!loading && files.map((item) => (
            <article key={item.path} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
              {item.mimeType?.startsWith("image/") && item.signedUrl ? (
                <img
                  src={item.signedUrl}
                  alt={`${item.name} preview`}
                  loading="lazy"
                  className="h-36 w-full object-cover rounded-md mb-3"
                />
              ) : (
                <div className="h-36 rounded-md bg-muted/40 mb-3 flex items-center justify-center text-sm text-muted-foreground">
                  {item.mimeType || "File"}
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => item.signedUrl && window.open(item.signedUrl, "_blank", "noopener,noreferrer")}
                    disabled={!item.signedUrl}
                  >
                    View
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.path)}>
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
