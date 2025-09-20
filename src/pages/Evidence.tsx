import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceWizard } from "@/components/evidence/EvidenceWizard";
import { EvidenceAnalysisFeedback } from "@/components/evidence/EvidenceAnalysisFeedback";
import { LiveCaseInsights } from "@/components/case/LiveCaseInsights";
import { ProcessingStatus } from "@/components/evidence/ProcessingStatus";
import { sanitizeFileName } from "@/lib/utils";
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Camera, 
  MessageSquare, 
  Heart, 
  DollarSign,
  Users,
  Shield,
  Trash2
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
    auto_category?: string;
    tags?: string[];
  };

  const [files, setFiles] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [showWizard, setShowWizard] = useState(false);
  const [filesByCategory, setFilesByCategory] = useState<Record<string, EvidenceItem[]>>({});
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

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
        // Sanitize filename for storage path
        const sanitizedName = sanitizeFileName(file.name);
        const path = `${uid}/${Date.now()}-${sanitizedName}`;
        console.log("[Evidence] Uploading file", { originalName: file.name, sanitizedName, path });
        
        for (let i = 0; i < attempts; i++) {
          const { error } = await supabase.storage.from("evidence").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
            metadata: {
              originalName: file.name, // Preserve original filename in metadata
            },
          });
          if (!error) return { ok: true as const, name: file.name, path };
          if (i === attempts - 1) {
            console.error("Upload failed:", file.name, error);
            toast.error(`Upload failed for "${file.name}": ${error.message || 'Unknown error'}`);
            return { ok: false as const, name: file.name };
          }
          await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        }
        return { ok: false as const, name: file.name };
      };

      const results = await Promise.all(valid.map((file) => uploadWithRetry(file)));

      const success = results.filter((r) => r.ok).length;
      const failed = results.length - success;
      
      if (success) {
        toast.success(`Uploaded ${success} file(s). Analysis starting automatically...`);
        
        // Automatically trigger analysis for each uploaded file
        const successfulUploads = results.filter((r) => r.ok);
        for (const upload of successfulUploads) {
          if (upload.ok) {
            try {
              const response = await supabase.functions.invoke("ingest-file", {
                body: { path: upload.path },
              });
              
              if (response.data?.analysis) {
                setLatestAnalysis({
                  ...response.data.analysis,
                  fileName: upload.name
                });
              }
            } catch (err) {
              console.error(`Auto-analysis failed for ${upload.name}:`, err);
              // Don't show error toast for auto-analysis failures
            }
          }
        }
      }
      
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


  const detectFileCategory = (file: EvidenceItem) => {
    // Check if file has auto_category from AI categorization first
    const metaCategory = file.auto_category;
    if (metaCategory) {
      // Map AI categories to display categories
      const categoryMap = {
        'police_report': 'Official Documents',
        'medical_record': 'Medical Records', 
        'financial_document': 'Financial Evidence',
        'court_document': 'Official Documents',
        'correspondence': 'Messages & Communication',
        'incident_report': 'Official Documents',
        'evidence_photo': 'Photos & Videos',
        'witness_statement': 'Witness Statements',
        'legal_notice': 'Official Documents',
        'other': 'Other Documents'
      };
      return categoryMap[metaCategory as keyof typeof categoryMap] || 'Other Documents';
    }

    // Fallback to filename-based detection
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

      <ProcessingStatus />
      
      {/* Show analysis feedback if available */}
      {latestAnalysis && (
        <EvidenceAnalysisFeedback
          analysis={latestAnalysis}
          fileName={latestAnalysis.fileName}
          onClose={() => setLatestAnalysis(null)}
        />
      )}

      {/* Live case insights */}
      <LiveCaseInsights />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Evidence Library</h1>
          <p className="text-lg text-muted-foreground">
            Your files are organized and secure. Building a strong case together.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Auto-analysis enabled
          </div>
          <Button 
            onClick={() => setShowWizard(true)}
            size="lg"
            className="px-6 py-3 font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Evidence
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="max-w-2xl mx-auto">
          <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">Start Building Your Legal Case</CardTitle>
                  <p className="text-muted-foreground text-lg">
                    Upload your evidence and we'll analyze everything automatically
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Secure & Private
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    AI-Powered Analysis
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    Instant Organization
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowWizard(true)}
                  size="lg"
                  className="px-8 py-3 text-lg font-medium"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Upload Your First Evidence
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                             <div className="flex items-center gap-2">
                               <p className="text-xs text-muted-foreground">
                                 {formatBytes(item.size)}
                               </p>
                               {item.auto_category && (
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                                   Auto-categorized
                                 </span>
                               )}
                             </div>
                            
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
                                  onClick={() => handleDelete(item.path)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          
          {/* Modern upload section */}
          <div className="mt-8">
            <Card className="border-dashed border-2 border-primary/30 hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                  onClick={() => setShowWizard(true)}>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Add More Evidence</h3>
                    <p className="text-sm text-muted-foreground">
                      Drop files here or click to browse • Analysis happens automatically
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Documents
                    </div>
                    <div className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Images
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Messages
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
