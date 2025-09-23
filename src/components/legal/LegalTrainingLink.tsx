import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function LegalTrainingLink() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200/50 rounded-lg">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-purple-600" />
        <div>
          <h3 className="font-semibold text-purple-900">Train Veronica with NSW Legal Documents</h3>
          <p className="text-sm text-purple-700">Upload Acts, Regulations, Case Law & Practice Directions</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          AI Training
        </Badge>
        <Button 
          onClick={() => navigate('/legal-training-dashboard')}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
        >
          Training Dashboard
        </Button>
      </div>
    </div>
  );
}