import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalDisclaimerAlertProps {
  isLegalAdvice?: boolean;
  verificationStatus?: 'ai_generated' | 'requires_review' | 'lawyer_verified';
}

export function LegalDisclaimerAlert({ isLegalAdvice, verificationStatus }: LegalDisclaimerAlertProps) {
  if (!isLegalAdvice) return null;

  // Don't show disclaimer for lawyer-verified content
  if (verificationStatus === 'lawyer_verified') return null;

  return (
    <Alert className="mt-3 bg-amber-50 border-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-xs text-amber-800 ml-2">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Scale className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Legal Information, Not Legal Advice</strong>
              <p className="mt-1">
                This is AI-generated legal information based on NSW law. It is NOT personalized legal advice. 
                Your specific circumstances may require different actions.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs bg-white hover:bg-amber-100"
              onClick={() => window.open('https://www.lawaccess.nsw.gov.au/', '_blank')}
            >
              Find a Lawyer
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => {
                const el = document.getElementById('disclaimer-details');
                if (el) el.classList.toggle('hidden');
              }}
            >
              Why this disclaimer?
            </Button>
          </div>
          <div id="disclaimer-details" className="hidden text-xs mt-2 p-2 bg-white rounded border border-amber-200">
            <p className="font-semibold mb-1">AI limitations:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>May not account for all facts in your situation</li>
              <li>Cannot assess evidence quality or courtroom dynamics</li>
              <li>Legal interpretations can vary between courts and judges</li>
              <li>Recent law changes may not be reflected</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
