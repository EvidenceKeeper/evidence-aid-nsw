import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  result?: any;
}

export function NSWLegalUploader() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [sourceType, setSourceType] = useState<string>('legislation');
  const [sourceUrl, setSourceUrl] = useState('');
  const [content, setContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    jurisdiction: 'NSW',
    document_type: '',
    source_authority: '',
    effective_date: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (!metadata.title) {
        setMetadata(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      }
      
      // For text files, read content directly
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setContent(text);
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // For PDFs, we'll process them server-side
        setContent(''); // Clear any existing content
        toast({
          title: "PDF Selected",
          description: "PDF will be processed server-side during ingestion",
        });
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async () => {
    if (!content && !sourceUrl && !uploadedFile) {
      toast({
        title: "Missing Content",
        description: "Please provide content, a source URL, or upload a file",
        variant: "destructive"
      });
      return;
    }

    if (!metadata.title || !metadata.document_type) {
      toast({
        title: "Missing Metadata",
        description: "Please fill in the title and document type",
        variant: "destructive"
      });
      return;
    }

    setUploadStatus({ status: 'uploading', message: 'Uploading legal document...' });

    try {
      let filePath: string | undefined;
      
      // Upload file to storage if we have one
      if (uploadedFile) {
        setUploadStatus({ status: 'uploading', message: 'Uploading file to storage...' });
        
        const fileName = `legal-docs/${Date.now()}-${uploadedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, uploadedFile);
          
        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }
        
        filePath = fileName;
        setUploadStatus({ status: 'processing', message: 'Processing document...' });
      }

      const { data, error } = await supabase.functions.invoke('nsw-legal-ingestor', {
        body: {
          source_type: sourceType,
          source_url: sourceUrl || undefined,
          content: content || undefined,
          file_path: filePath,
          metadata: {
            ...metadata,
            tags: metadata.tags.length > 0 ? metadata.tags : undefined
          },
          chunk_config: {
            chunk_size: 1000,
            overlap: 100,
            respect_boundaries: true
          }
        }
      });

      if (error) {
        throw error;
      }

      setUploadStatus({ 
        status: 'completed', 
        message: 'Legal document processed successfully!',
        result: data
      });

      toast({
        title: "✅ Legal Document Ingested",
        description: `Successfully processed: ${data.chunks_created} chunks, ${data.citations_extracted} citations, ${data.legal_concepts_identified?.length || 0} legal concepts`,
      });

      // Reset form
      setContent('');
      setSourceUrl('');
      setUploadedFile(null);
      setMetadata({
        title: '',
        jurisdiction: 'NSW',
        document_type: '',
        source_authority: '',
        effective_date: '',
        tags: []
      });

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus({ 
        status: 'error', 
        message: error.message || 'Upload failed'
      });
      toast({
        title: "Upload Failed",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    }
  };

  const isLoading = uploadStatus.status === 'uploading' || uploadStatus.status === 'processing';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          NSW Legal Document Ingestor
        </CardTitle>
        <CardDescription>
          Upload NSW legal documents (Acts, Regulations, Case Law, Practice Directions) for AI training and retrieval
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Source Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="source-type">Source Type</Label>
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="legislation">Legislation (Acts, Regulations)</SelectItem>
              <SelectItem value="case_law">Case Law</SelectItem>
              <SelectItem value="practice_direction">Practice Direction</SelectItem>
              <SelectItem value="regulation">Regulation</SelectItem>
              <SelectItem value="manual">Manual Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Input Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="source-url">Source URL (Optional)</Label>
            <Input
              id="source-url"
              placeholder="https://legislation.nsw.gov.au/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Approved domains: legislation.nsw.gov.au, austlii.edu.au, supremecourt.nsw.gov.au
            </p>
            {uploadedFile && (
              <p className="text-xs text-green-600">
                File selected: {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.html,.md,.pdf"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Content Textarea */}
        <div className="space-y-2">
          <Label htmlFor="content">Document Content</Label>
          <Textarea
            id="content"
            placeholder="Paste legal document content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            disabled={isLoading}
            className="font-mono text-sm"
          />
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Crimes (Domestic and Personal Violence) Act 2007"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type *</Label>
            <Input
              id="document-type"
              placeholder="e.g., Act, Regulation, Case Law"
              value={metadata.document_type}
              onChange={(e) => setMetadata(prev => ({ ...prev, document_type: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-authority">Source Authority</Label>
            <Input
              id="source-authority"
              placeholder="e.g., NSW Parliament, Supreme Court of NSW"
              value={metadata.source_authority}
              onChange={(e) => setMetadata(prev => ({ ...prev, source_authority: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effective-date">Effective Date</Label>
            <Input
              id="effective-date"
              type="date"
              value={metadata.effective_date}
              onChange={(e) => setMetadata(prev => ({ ...prev, effective_date: e.target.value }))}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag (e.g., domestic-violence, coercive-control)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              disabled={isLoading}
            />
            <Button onClick={addTag} variant="outline" disabled={isLoading}>
              Add
            </Button>
          </div>
          {metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Status Display */}
        {uploadStatus.status !== 'idle' && (
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              {uploadStatus.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploadStatus.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {uploadStatus.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
              <span className="font-medium">{uploadStatus.message}</span>
            </div>
            
            {uploadStatus.result && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Document ID: {uploadStatus.result.document_id}</p>
                <p>Chunks Created: {uploadStatus.result.chunks_created}</p>
                <p>Citations Extracted: {uploadStatus.result.citations_extracted}</p>
                <p>Legal Concepts: {uploadStatus.result.legal_concepts_identified?.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || (!content && !sourceUrl && !uploadedFile)}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Legal Document...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Ingest Legal Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}