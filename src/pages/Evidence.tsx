import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceWizard } from "@/components/evidence/EvidenceWizard";
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Camera, 
  MessageSquare, 
  Heart, 
  DollarSign,
  Users,
  Shield
} from "lucide-react";

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
  const [showWizard, setShowWizard] = useState(false);
  const [filesByCategory, setFilesByCategory] = useState<Record<string, EvidenceItem[]>>({});

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
      
      // Group files by category for better organization
      const grouped = items.reduce((acc, file) => {
        const category = detectFileCategory(file);
        if (!acc[category]) acc[category] = [];
        acc[category].push(file);
        return acc;
      }, {} as Record<string, EvidenceItem[]>);
      
      setFilesByCategory(grouped);
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

  const handleIndex = async (item: EvidenceItem) => {
    if (!item?.path) return;
    try {
      setIndexing(item.path);
      const { error } = await supabase.functions.invoke("ingest-file", {
        body: { path: item.path },
      });
      if (error) throw error;
      toast.success(`Indexed ${item.name}`);
      await loadFiles();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Indexing failed");
    } finally {
      setIndexing(null);
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

  const detectFileCategory = (file: EvidenceItem) => {
    if (file.mimeType?.startsWith('image/')) return 'Photos & Videos';
    if (file.name.toLowerCase().includes('message') || file.name.toLowerCase().includes('text')) return 'Messages & Communication';
    if (file.name.toLowerCase().includes('medical') || file.name.toLowerCase().includes('doctor')) return 'Medical Records';
    if (file.name.toLowerCase().includes('bank') || file.name.toLowerCase().includes('financial')) return 'Financial Evidence';
    if (file.name.toLowerCase().includes('witness') || file.name.toLowerCase().includes('statement')) return 'Witness Statements';
    return 'Official Documents';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'Photos & Videos': Camera,
      'Messages & Communication': MessageSquare,
      'Medical Records': Heart,
      'Financial Evidence': DollarSign,
      'Witness Statements': Users,
      'Official Documents': FileText,
    };
    return icons[category as keyof typeof icons] || FileText;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Photos & Videos': 'bg-purple-50 border-purple-200',
      'Messages & Communication': 'bg-blue-50 border-blue-200',
      'Medical Records': 'bg-red-50 border-red-200',
      'Financial Evidence': 'bg-yellow-50 border-yellow-200',
      'Witness Statements': 'bg-indigo-50 border-indigo-200',
      'Official Documents': 'bg-green-50 border-green-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-50 border-gray-200';
  };

  if (showWizard) {
    return (
      <div className="container mx-auto px-6 py-8">
        <SEO title="Upload Evidence | NSW Legal Evidence Manager" description="Guided evidence upload to organize your case documents safely and securely." />
        <EvidenceWizard onComplete={() => {
          setShowWizard(false);
          loadFiles();
        }} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Evidence Library | NSW Legal Evidence Manager" description="View and organize your uploaded evidence in a simple, trauma-informed interface." />

      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Your Evidence Library</h1>
          <p className="text-muted-foreground">Your files are organized and secure. You're building a strong case.</p>
        </div>
        <Button 
          onClick={() => setShowWizard(true)}
          size="lg"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Evidence
        </Button>
      </header>

      {files.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Start Building Your Case</CardTitle>
            <p className="text-muted-foreground mb-6">
              Upload your evidence and we'll help organize everything automatically. 
              Your information is private and secure.
            </p>
            <Button 
              onClick={() => setShowWizard(true)}
              size="lg"
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Upload First Evidence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(filesByCategory).map(([category, categoryFiles]) => {
            const CategoryIcon = getCategoryIcon(category);
            return (
              <Card key={category} className={`${getCategoryColor(category)}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/80">
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {categoryFiles.length} file{categoryFiles.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryFiles.map((item) => (
                      <Card key={item.path} className="bg-white border hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          {item.mimeType?.startsWith("image/") && item.signedUrl ? (
                            <img
                              src={item.signedUrl}
                              alt={`${item.name} preview`}
                              loading="lazy"
                              className="h-32 w-full object-cover rounded-md mb-3"
                            />
                          ) : (
                            <div className="h-32 rounded-md bg-muted/40 mb-3 flex items-center justify-center">
                              <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium truncate" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(item.size)}
                            </p>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => item.signedUrl && window.open(item.signedUrl, "_blank", "noopener,noreferrer")}
                                disabled={!item.signedUrl}
                                className="flex-1"
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIndex(item)}
                                disabled={indexing === item.path}
                                className="flex-1"
                              >
                                {indexing === item.path ? "Processing..." : "Process"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Quick access to add more evidence */}
          <Card className="border-dashed border-2 hover:border-primary/60 transition-colors cursor-pointer"
                onClick={() => setShowWizard(true)}>
            <CardContent className="text-center py-8">
              <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Add more evidence to strengthen your case</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
