import { supabase } from "@/integrations/supabase/client";

export interface FileProcessingResult {
  fileId: string;
  fileName: string;
  success: boolean;
  embeddings_generated?: number;
  exhibit_code?: string;
  error?: string;
}

export async function processFileEmbeddings(fileId: string): Promise<FileProcessingResult> {
  try {
    console.log(`🔄 Processing file (old embedding system removed): ${fileId}`);
    
    // Note: Old embedding-based processing removed. 
    // Files are now processed automatically via process-file edge function
    return {
      fileId,
      fileName: fileId,
      success: false,
      error: 'Embedding generation has been removed. Files are now processed automatically on upload.'
    };
  } catch (error: any) {
    console.error(`❌ Failed to process file ${fileId}:`, error);
    return {
      fileId,
      fileName: fileId,
      success: false,
      error: error.message
    };
  }
}

export async function processMultipleFiles(fileIds: string[]): Promise<FileProcessingResult[]> {
  const results = await Promise.allSettled(
    fileIds.map(fileId => processFileEmbeddings(fileId))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        fileId: fileIds[index],
        fileName: fileIds[index],
        success: false,
        error: result.reason?.message || 'Processing failed'
      };
    }
  });
}