import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function TestLegalProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      console.log("Invoking legal-document-processor...");
      const { data, error } = await supabase.functions.invoke('legal-document-processor', {
        body: {}
      });

      if (error) {
        console.error("Processor error:", error);
        toast.error(`Processing failed: ${error.message}`);
      } else {
        console.log("Processor result:", data);
        setResult(data);
        toast.success(`Processing completed: ${data.message}`);
      }
    } catch (error) {
      console.error("Function call error:", error);
      toast.error("Failed to call processor function");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Legal Document Processor</h1>
      
      <Card className="p-6">
        <div className="space-y-4">
          <p>Click the button below to manually trigger the legal document processor.</p>
          
          <Button 
            onClick={handleProcessQueue}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Process Pending Documents"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Processing Result:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}