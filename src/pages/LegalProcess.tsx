import { SEO } from "@/components/SEO";
import PoliceProcessNavigator from "@/components/legal/PoliceProcessNavigator";

export default function LegalProcess() {
  return (
    <div className="container mx-auto px-6 py-8">
      <SEO 
        title="Legal Process Guide | NSW Legal Evidence Manager" 
        description="Step-by-step guidance through NSW legal processes and procedures."
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Legal Process Guide</h1>
        <p className="text-muted-foreground text-lg">
          Navigate NSW legal procedures with confidence and clarity.
        </p>
      </div>

      <PoliceProcessNavigator />
    </div>
  );
}