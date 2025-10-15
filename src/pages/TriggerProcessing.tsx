import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlayCircle, Loader2 } from 'lucide-react';

export default function TriggerProcessing() {
  const [processing, setProcessing] = useState(false);

  const handleTrigger = async () => {
    setProcessing(true);
    try {
      console.log('Manually triggering legal-document-processor...');
      
      const { data, error } = await supabase.functions.invoke('legal-document-processor', {
        body: {}
      });

      if (error) {
        console.error('Processor error:', error);
        toast.error(`Processing failed: ${error.message}`);
      } else {
        console.log('Processor response:', data);
        toast.success(`Processing complete! Processed: ${data.processed || 0}, Failed: ${data.failed || 0}`);
      }
    } catch (err) {
      console.error('Trigger error:', err);
      toast.error('Failed to trigger processing');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Manual Processing Trigger</h1>
        <p className="text-muted-foreground mb-6">
          Click below to manually trigger the PDF processing pipeline for your uploaded document.
        </p>
        
        <Button 
          onClick={handleTrigger} 
          disabled={processing}
          size="lg"
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-5 w-5" />
              Trigger PDF Processing Now
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
