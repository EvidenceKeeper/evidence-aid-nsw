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
    console.log(`🔄 Processing embeddings for file: ${fileId}`);
    
    const { data, error } = await supabase.functions.invoke('enhanced-memory-processor', {
      body: { file_id: fileId, processing_type: "embeddings_and_summaries" }
    });

    if (error) {
      throw new Error(error.message || 'Function invocation failed');
    }

    console.log(`✅ Successfully processed file: ${fileId}`, data);
    
    return {
      fileId,
      fileName: data.file_name || fileId,
      success: true,
      embeddings_generated: data.embeddings_generated,
      exhibit_code: data.exhibit_code
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