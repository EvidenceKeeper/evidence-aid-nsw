import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
          const path = `${uid}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage
            .from("evidence")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || "application/octet-stream",
            });
          
          if (error) throw error;

          // Auto-process the file
          const { error: processError } = await supabase.functions.invoke("ingest-file", {
            body: { path }
          });
          
          if (processError) console.warn("Auto-processing failed:", processError);
          
          return { name: file.name, path, category: selectedCategory };
        })
      );

      toast.success(`Successfully uploaded ${results.length} files! They're being organized automatically.`);
      setStep(4);
      
      // Auto-advance to completion after showing success
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (step === 1) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl mb-2">Let's organize your evidence together</CardTitle>
          <p className="text-muted-foreground">
            This is a safe space. Your information is private and secure. We'll help you organize everything step by step.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">You're taking an important step</p>
                  <p className="text-sm text-green-700">Organizing your evidence helps build a stronger case</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setStep(2)} 
              className="w-full" 
              size="lg"
            >
              Start organizing my evidence
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl mb-2">What type of evidence are you adding?</CardTitle>
          <p className="text-muted-foreground">Choose the category that best fits your files</p>
          <Progress value={33} className="w-full mt-4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidenceCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedCategory === category.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${category.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      {selectedCategory === category.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button 
              onClick={() => setStep(3)} 
              disabled={!selectedCategory}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 3) {
    const selectedCat = evidenceCategories.find(c => c.id === selectedCategory);
    const Icon = selectedCat?.icon || FileText;

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${selectedCat?.color}`}>
            <Icon className="w-8 h-8" />
          </div>
          <CardTitle className="text-xl mb-2">Upload your {selectedCat?.name}</CardTitle>
          <p className="text-muted-foreground">{selectedCat?.description}</p>
          <Progress value={66} className="w-full mt-4" />
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
                <p className="text-muted-foreground">or click to browse</p>
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

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button 
              onClick={handleUploadAndProcess}
              disabled={uploadedFiles.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading & organizing...
                </>
              ) : (
                <>
                  Upload {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl mb-2 text-green-800">Evidence uploaded successfully!</CardTitle>
        <p className="text-muted-foreground">
          Your files are being organized automatically. You can view them in your evidence library.
        </p>
        <Progress value={100} className="w-full mt-4" />
      </CardHeader>
    </Card>
  );
}