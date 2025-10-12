import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Camera, 
  FileText, 
  Heart, 
  DollarSign, 
  Users, 
  Shield,
  Upload,
  Check,
  ArrowRight
} from "lucide-react";

const evidenceCategories = [
  { 
    id: "messages", 
    name: "Messages & Communication", 
    icon: MessageSquare, 
    description: "Text messages, emails, social media posts",
    color: "bg-blue-50 border-blue-200 text-blue-700"
  },
  { 
    id: "photos", 
    name: "Photos & Videos", 
    icon: Camera, 
    description: "Pictures, videos, screenshots of evidence",
    color: "bg-purple-50 border-purple-200 text-purple-700"
  },
  { 
    id: "documents", 
    name: "Official Documents", 
    icon: FileText, 
    description: "Police reports, court papers, legal documents",
    color: "bg-green-50 border-green-200 text-green-700"
  },
  { 
    id: "medical", 
    name: "Medical Records", 
    icon: Heart, 
    description: "Doctor reports, hospital records, therapy notes",
    color: "bg-red-50 border-red-200 text-red-700"
  },
  { 
    id: "financial", 
    name: "Financial Evidence", 
    icon: DollarSign, 
    description: "Bank statements, receipts, financial abuse evidence",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700"
  },
  { 
    id: "witness", 
    name: "Witness Statements", 
    icon: Users, 
    description: "Statements from family, friends, professionals",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700"
  },
];

interface EvidenceWizardProps {
  onComplete: () => void;
}

export function EvidenceWizard({ onComplete }: EvidenceWizardProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

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

  const handleUploadAndProcess = async () => {
    if (!uploadedFiles.length) return;
    
    setUploading(true);
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please log in to upload your evidence securely.");
        return;
      }

      const uid = session.user.id;
      const results = await Promise.all(
        uploadedFiles.map(async (file) => {
          const sanitizedName = sanitizeFileName(file.name);
          const path = `${uid}/${Date.now()}-${sanitizedName}`;
          console.log("[EvidenceWizard] Uploading file", { originalName: file.name, sanitizedName, path });
          const { error } = await supabase.storage
            .from("evidence")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || "application/octet-stream",
            });
          
          if (error) throw error;

          // Auto-process the file
          const { error: processError } = await supabase.functions.invoke("process-file", {
            body: { path }
          });
          
          if (processError) console.warn("Auto-processing failed:", processError);
          
          return { name: file.name, path };
        })
      );

      toast.success(`Successfully uploaded ${results.length} files! They're being categorized automatically.`);
      
      // Auto-advance to completion
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl mb-2">Upload your evidence</CardTitle>
        <p className="text-muted-foreground">
          Drag and drop your files or click to browse. We'll automatically organize everything for you.
        </p>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-lg">Drop your files here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag and drop your files here</p>
              <p className="text-muted-foreground">or click to browse • PDF, images, documents, audio, video</p>
            </div>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Files ready to upload ({uploadedFiles.length})</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedFiles.length > 0 ? (
          <div className="space-y-4 mt-6">
            <Button 
              onClick={handleUploadAndProcess}
              disabled={uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading & analyzing...
                </>
              ) : (
                <>
                  Upload {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        ) : null}

        {processing && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div>
                  <p className="font-medium text-blue-800">Processing complete!</p>
                  <p className="text-sm text-blue-700">Your files have been uploaded and organized</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}